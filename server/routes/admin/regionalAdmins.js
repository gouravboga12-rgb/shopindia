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

    const updatedProfile = await prisma.regionalAdminProfile.update({
      where: { userId: id },
      data: {
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
    }

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

module.exports = router;
