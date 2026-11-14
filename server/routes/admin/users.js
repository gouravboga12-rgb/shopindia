const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { verifyToken }      = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken);

// Middleware for routes that require manage_users specifically
const restrictManage = requirePermission('manage_users');
// Middleware for routes that only require view_users (manage_users is also fine)
const restrictView = requirePermission('view_users', 'manage_users');

/** GET /api/admin/users?role=&status=&page=&limit= — FR-05.2 */
router.get('/', restrictView, async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20, q } = req.query;
    const where = {};
    if (role)   where.role   = role;
    if (status) where.status = status;
    if (q)      where.name   = { contains: q, mode: 'insensitive' };

    // Data isolation for Branch Managers
    if (req.user.role === 'branch_manager' && req.user.branchId) {
      where.branchId = req.user.branchId;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { branch: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    const sanitizedUsers = users.map(({ password: _, ...u }) => u);
    res.json({ users: sanitizedUsers, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/users/:id */
router.get('/:id', restrictView, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { branch: { select: { name: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password, ...sanitized } = user;
    res.json(sanitized);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/users — create team member */
router.post('/', restrictManage, async (req, res) => {
  try {
    const { password, ...data } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'Password@123', 10);
    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
    const { password: _, ...sanitized } = user;
    res.status(201).json(sanitized);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** PATCH /api/admin/users/:id/status — suspend / block / activate — FR-05.2 */
router.patch('/:id/status', restrictManage, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
    });
    const { password, ...sanitized } = user;
    res.json(sanitized);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/admin/users/:id/permissions — update custom permissions */
router.patch('/:id/permissions', restrictManage, async (req, res) => {
  try {
    const { permissions } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { permissions },
    });
    const { password, ...sanitized } = user;
    res.json(sanitized);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** DELETE /api/admin/users/:id — permanently delete user from database with confirmation and cascade */
router.delete('/:id', restrictManage, async (req, res) => {
  try {
    const { id } = req.params;

    // Safety checks
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own active super admin account.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (targetUser.email === 'admin@shopindia.in') {
      return res.status(400).json({ error: 'The primary super admin account (admin@shopindia.in) cannot be deleted.' });
    }

    // Clean up all dependent records before deleting user
    await prisma.$transaction(async (tx) => {
      // 1. Carts and Wishlists
      await tx.cartItem.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.cart.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.wishlistItem.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.wishlist.deleteMany({ where: { userId: id } }).catch(() => {});

      // 2. Notifications, Activity, Addresses, Payment Methods, Rewards, Reviews
      await tx.userNotification.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.userActivity.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.address.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.paymentMethod.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.reward.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.review.deleteMany({ where: { userId: id } }).catch(() => {});

      // 3. Support Tickets (unassign or delete customer tickets)
      await tx.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }).catch(() => {});
      await tx.ticketMessage.deleteMany({ where: { senderId: id } }).catch(() => {});
      await tx.ticket.deleteMany({ where: { customerId: id } }).catch(() => {});

      // 4. Profiles (Regional Admin, Rider, Branch Staff)
      await tx.regionalAdminProfile.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.riderProfile.deleteMany({ where: { userId: id } }).catch(() => {});
      await tx.branchStaff.deleteMany({ where: { userId: id } }).catch(() => {});

      // 5. Vendor links
      await tx.vendor.updateMany({ where: { approvedById: id }, data: { approvedById: null } }).catch(() => {});
      await tx.vendor.deleteMany({ where: { userId: id } }).catch(() => {});

      // 6. Orders (if any, remove items and deliveries)
      const userOrders = await tx.order.findMany({ where: { customerId: id }, select: { id: true } });
      if (userOrders.length > 0) {
        const orderIds = userOrders.map(o => o.id);
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
        await tx.delivery.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {});
        await tx.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => {});
      }

      // 7. Permanently delete the user record from database
      await tx.user.delete({ where: { id } });
    });

    res.json({ success: true, message: `User "${targetUser.name}" (${targetUser.email}) permanently deleted from database.` });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message || 'Failed to delete user.' });
  }
});

module.exports = router;
