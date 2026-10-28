'use strict';
/**
 * server/routes/regional-admin/payouts.js
 * Regional Admin Territory Partner Payout Verification & Forwarding Queue.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('regional_admin', 'super_admin'));

/**
 * GET /api/regional-admin/payouts
 * Returns pending payout requests strictly from merchants and riders in this regional admin's territory.
 * Payout requests outside this territory are handled directly by the Super Admin.
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    const profile = await prisma.regionalAdminProfile.findUnique({
      where: { userId },
      include: { branch: true },
    });

    const assignedPincodes = profile?.assignedPincodes || [];
    const branchId = profile?.branchId;

    // Strict territory conditions: partner must reside in Regional Admin's assigned branch or pincodes
    const orConditions = [];
    if (branchId) {
      orConditions.push({ vendor: { branchId } });
      orConditions.push({ riderProfile: { branchId } });
    }
    if (assignedPincodes.length > 0) {
      orConditions.push({ vendor: { pincode: { in: assignedPincodes } } });
      // Match the rider's address containing the assigned 6-digit pincode
      assignedPincodes.forEach((pin) => {
        if (pin && pin.trim()) {
          orConditions.push({ riderProfile: { address: { contains: pin.trim() } } });
        }
      });
    }

    // If Regional Admin has no assigned branch and no assigned pincodes, return empty queue
    if (orConditions.length === 0) {
      return res.json({
        success: true,
        territory: profile?.regionName || 'Unassigned Hub',
        assignedPincodes: [],
        requests: [],
        totalInScope: 0,
      });
    }

    const where = {
      status: { in: ['pending', 'under_review', 'approved'] },
      OR: orConditions,
    };

    const requests = await prisma.payoutRequest.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            contactName: true,
            phone: true,
            email: true,
            street: true,
            city: true,
            state: true,
            pincode: true,
            gstNumber: true,
            panNumber: true,
            walletBalance: true,
            accountHolder: true,
            accountNumber: true,
            ifsc: true,
            bankName: true,
            upiId: true,
            approvalStatus: true,
            isActive: true,
            documents: { select: { id: true, name: true, url: true } },
            user: {
              select: { id: true, status: true, phone: true, email: true },
            },
          },
        },
        riderProfile: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true, status: true } },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    res.json({
      success: true,
      territory: profile?.regionName || 'My Region',
      assignedPincodes,
      requests,
      totalInScope: requests.length,
    });
  } catch (err) {
    console.error('[RegionalPayouts] GET error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch territory payouts.' });
  }
});

/**
 * POST /api/regional-admin/payouts/:id/verify
 * Verifies partner activity, adds inspection note, and forwards to Super Admin for clearance.
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { note, action = 'approve' } = req.body;

    const request = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Payout request not found.' });

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Payout is already completed.' });
    }

    let newStatus = 'approved';
    let prefix = 'Regional Verification';
    if (action === 'escalate' || action === 'flag') {
      newStatus = 'under_review';
      prefix = 'Regional Escalation to Super Admin';
    } else if (action === 'reject') {
      newStatus = 'rejected';
      prefix = 'Regional Rejection';
    }

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        notes: `${request.notes ? request.notes + '\n' : ''}[${prefix} (${new Date().toLocaleDateString('en-IN')})]: ${note || (action === 'approve' ? 'Verified by Regional Lead' : action === 'escalate' ? 'Escalated to Super Admin by Regional Lead due to verification issue' : 'Rejected by Regional Lead')}`,
      },
    });

    const statusMsg = action === 'approve'
      ? 'Payout verified and forwarded to Super Admin for disbursal.'
      : action === 'escalate'
      ? 'Payout flagged and escalated directly to Super Admin with failure findings.'
      : 'Payout rejected.';

    res.json({
      success: true,
      message: statusMsg,
      payout: updated,
    });
  } catch (err) {
    console.error('[RegionalPayouts] Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/payouts/partner/toggle-suspend
 * Regional Admin suspends or reactivates a partner in their assigned territory
 */
router.post('/partner/toggle-suspend', async (req, res) => {
  try {
    const { partyType, partyId, reason } = req.body;
    const normalizedParty = String(partyType).toUpperCase();
    const userId = req.user?.userId || req.user?.id;

    const profile = await prisma.regionalAdminProfile.findUnique({
      where: { userId },
      include: { branch: true },
    });

    const assignedPincodes = profile?.assignedPincodes || [];
    const branchId = profile?.branchId;

    let targetUserId = null;
    let partnerName = 'Partner';
    let isInsideTerritory = false;

    if (normalizedParty === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({
        where: { id: partyId },
        include: { user: true },
      });
      if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

      if (branchId && vendor.branchId === branchId) isInsideTerritory = true;
      if (vendor.pincode && assignedPincodes.includes(vendor.pincode)) isInsideTerritory = true;

      targetUserId = vendor.userId;
      partnerName = vendor.businessName;
    } else {
      const rider = await prisma.riderProfile.findUnique({
        where: { id: partyId },
        include: { user: true },
      });
      if (!rider) return res.status(404).json({ error: 'Rider not found.' });

      if (branchId && rider.branchId === branchId) isInsideTerritory = true;
      if (assignedPincodes.some(p => (rider.address || '').includes(p))) isInsideTerritory = true;

      targetUserId = rider.userId;
      partnerName = rider.user?.name || 'Rider';
    }

    if (!isInsideTerritory && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'You can only suspend partners registered inside your assigned territory.' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return res.status(404).json({ error: 'Associated user record not found.' });

    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { status: newStatus },
      });

      if (normalizedParty === 'RIDER') {
        await tx.riderProfile.update({
          where: { id: partyId },
          data: {
            isActive: newStatus === 'active',
            isOnline: newStatus === 'active' ? undefined : false,
          },
        });
      } else if (normalizedParty === 'VENDOR') {
        if (newStatus === 'suspended') {
          await tx.vendor.update({
            where: { id: partyId },
            data: { approvalStatus: 'rejected', approvalNote: reason || 'Suspended by Regional Admin' },
          });
        } else {
          await tx.vendor.update({
            where: { id: partyId },
            data: { approvalStatus: 'approved', approvalNote: 'Reactivated by Regional Admin' },
          });
        }
      }
    });

    res.json({
      success: true,
      message: `${partnerName} account has been ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`,
      status: newStatus,
    });
  } catch (err) {
    console.error('[Regional Partner Suspend] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
