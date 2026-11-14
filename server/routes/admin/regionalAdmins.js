const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken);
router.use(requireRole('super_admin'));

/**
 * GET /api/admin/regional-admins
 * List all regional administrators with profile, branch and performance metrics
 */
router.get('/', async (req, res) => {
  try {
    const regionalAdmins = await prisma.user.findMany({
      where: { role: 'regional_admin' },
      include: {
        regionalAdminProfile: {
          include: {
            branch: { select: { id: true, name: true, city: true, state: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ regionalAdmins });
  } catch (error) {
    console.error('Error fetching regional admins:', error);
    res.status(500).json({ error: 'Failed to fetch regional admins' });
  }
});

/**
 * PATCH /api/admin/regional-admins/:id/status
 * Approve, suspend, or reject regional admin application
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, branchId } = req.body;

    const validStatuses = ['approved', 'suspended', 'rejected', 'pending_approval'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updatedProfile = await prisma.regionalAdminProfile.upsert({
      where: { userId: id },
      create: {
        userId: id,
        regionName: 'Territory Hub',
        status: status || 'approved',
        approvedAt: status === 'approved' ? new Date() : undefined,
        branchId: branchId || undefined,
      },
      update: {
        ...(status ? { status, approvedAt: status === 'approved' ? new Date() : undefined } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: true,
      },
    });

    // Also update user status
    if (status === 'approved') {
      await prisma.user.update({
        where: { id },
        data: { status: 'active', branchId: branchId || undefined },
      });
    } else if (status === 'suspended') {
      await prisma.user.update({
        where: { id },
        data: { status: 'suspended' },
      });
    } else if (status === 'rejected') {
      await prisma.user.update({
        where: { id },
        data: { status: 'blocked' },
      });
    }

    try {
      const { broadcastAdminBadgeCounts } = require('../../lib/adminBadges');
      broadcastAdminBadgeCounts();
    } catch (e) {}

    res.json({
      success: true,
      message: `Regional admin status updated to ${status}.`,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating regional admin:', error);
    res.status(500).json({ error: 'Failed to update regional admin' });
  }
});

/**
 * DELETE /api/admin/regional-admins/:id
 * Permanently delete a regional administrator and purge all related territory data from database and panels
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Safety checks
    if (req.user && req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own active super admin account.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { regionalAdminProfile: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Regional administrator not found.' });
    }

    if (targetUser.email === 'admin@shopindia.in') {
      return res.status(400).json({ error: 'The primary super admin account (admin@shopindia.in) cannot be deleted.' });
    }

    // Clean up all dependent records before deleting user from database
    await prisma.$transaction(async (tx) => {
      // 1. Unlink branches where this user is manager
      await tx.branch.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      }).catch(() => {});

      // 2. Unlink branch staff records
      await tx.branchStaff.deleteMany({
        where: { userId: id },
      }).catch(() => {});

      // 3. Unassign or clean up support tickets
      await tx.ticket.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      }).catch(() => {});
      await tx.ticketMessage.deleteMany({
        where: { senderId: id },
      }).catch(() => {});
      await tx.ticket.deleteMany({
        where: { customerId: id },
      }).catch(() => {});

      // 4. Notifications & user activities
      await tx.userNotification.deleteMany({
        where: { userId: id },
      }).catch(() => {});
      await tx.userActivity.deleteMany({
        where: { userId: id },
      }).catch(() => {});

      // 5. Unlink vendor approvals
      await tx.vendor.updateMany({
        where: { approvedById: id },
        data: { approvedById: null },
      }).catch(() => {});

      // 6. Delete RegionalAdminProfile explicitly
      await tx.regionalAdminProfile.deleteMany({
        where: { userId: id },
      }).catch(() => {});

      // 7. Delete User record permanently
      await tx.user.delete({
        where: { id },
      });
    });

    // Realtime badge and socket sync across all panels
    try {
      const { broadcastAdminBadgeCounts } = require('../../lib/adminBadges');
      broadcastAdminBadgeCounts();
    } catch (e) {}

    try {
      const { getIo } = require('../../lib/socket');
      const io = getIo();
      if (io) {
        io.emit('regional_admin:profile_updated', { userId: id, action: 'deleted' });
        io.emit('regional_admin:deleted', { userId: id });
      }
    } catch (e) {}

    res.json({
      success: true,
      message: `Regional administrator "${targetUser.name}" (${targetUser.email}) and all territory data have been permanently deleted from database and panels.`,
    });
  } catch (error) {
    console.error('Error deleting regional admin:', error);
    res.status(500).json({ error: error.message || 'Failed to delete regional admin' });
  }
});

module.exports = router;
