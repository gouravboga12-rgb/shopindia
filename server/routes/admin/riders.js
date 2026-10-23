const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole, requirePermission } = require('../../middleware/rbac');

router.use(verifyToken);
router.use(requireRole('super_admin', 'branch_manager'));
router.use(requirePermission('view_users', 'manage_users'));

// Get all riders with profiles
router.get('/', async (req, res) => {
  try {
    const where = { role: 'rider' };
    
    // Data isolation for Branch Managers
    if (req.user.role === 'branch_manager' && req.user.branchId) {
      where.branchId = req.user.branchId;
    }

    const riders = await prisma.user.findMany({
      where,
      include: {
        riderProfile: {
          include: { deliveries: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ riders });
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ error: 'Failed to fetch riders' });
  }
});

// Update rider profile status / payouts
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isActive, payoutAmount } = req.body;

    // Update user status
    if (status) {
      await prisma.user.update({
        where: { id },
        data: { status }
      });
    }

    // Update rider profile
    let updatedProfile = null;
    if (isActive !== undefined || payoutAmount !== undefined) {
      const data = {};
      if (isActive !== undefined) data.isActive = isActive;
      if (payoutAmount !== undefined) {
        data.walletBalance = { decrement: payoutAmount };
      }
      
      updatedProfile = await prisma.riderProfile.update({
        where: { userId: id },
        data
      });
    }

    res.json({ message: 'Rider updated successfully' });
  } catch (error) {
    console.error('Error updating rider:', error);
    res.status(500).json({ error: 'Failed to update rider' });
  }
});

// DELETE /api/admin/riders/:id — Permanently delete rider profile and user record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { riderProfile: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Rider not found.' });
    }

    await prisma.$transaction(async (tx) => {
      if (user.riderProfile) {
        const rpId = user.riderProfile.id;
        // Unlink or clean up related child records
        await tx.payoutRequest.deleteMany({ where: { partyType: 'RIDER', partyId: rpId } });
        await tx.cODRemittance.deleteMany({ where: { riderId: rpId } });
        await tx.riderPayout.deleteMany({ where: { riderId: rpId } });
        await tx.ledgerEntry.deleteMany({ where: { party: 'RIDER', partyId: rpId } });
        await tx.delivery.updateMany({
          where: { riderProfileId: rpId },
          data: { riderProfileId: null },
        });
        await tx.riderProfile.delete({ where: { id: rpId } });
      }

      await tx.address.deleteMany({ where: { userId: id } });
      await tx.review.deleteMany({ where: { userId: id } });
      await tx.userNotification.deleteMany({ where: { userId: id } });
      await tx.userActivity.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    res.json({
      success: true,
      message: `Rider ${user.name} (${user.email}) and user account permanently deleted.`,
    });
  } catch (error) {
    console.error('Error deleting rider:', error);
    res.status(500).json({ error: error.message || 'Failed to delete rider.' });
  }
});

module.exports = router;

