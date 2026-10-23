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
 * Returns pending payout requests from merchants and riders in this regional admin's territory.
 */
router.get('/', async (req, res) => {
  try {
    const profile = await prisma.regionalAdminProfile.findUnique({
      where: { userId: req.user.userId },
    });

    const assignedPincodes = profile?.assignedPincodes || [];

    // Filter requests where vendor or rider resides in assigned pincodes
    const where = {
      status: { in: ['pending', 'under_review', 'approved'] },
    };

    if (assignedPincodes.length > 0) {
      where.OR = [
        { vendor: { pincode: { in: assignedPincodes } } },
        { riderProfile: { address: { in: assignedPincodes } } },
      ];
    }

    const requests = await prisma.payoutRequest.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            contactName: true,
            phone: true,
            city: true,
            pincode: true,
            walletBalance: true,
            accountHolder: true,
            accountNumber: true,
            ifsc: true,
            bankName: true,
            upiId: true,
          },
        },
        riderProfile: {
          include: {
            user: { select: { name: true, phone: true } },
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

    const newStatus = action === 'reject' ? 'rejected' : 'approved';
    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        notes: `${request.notes ? request.notes + '\n' : ''}[Regional Verification (${new Date().toLocaleDateString('en-IN')})]: ${note || (action === 'approve' ? 'Verified by Regional Lead' : 'Rejected by Regional Lead')}`,
      },
    });

    res.json({
      success: true,
      message: `Payout request ${newStatus} and updated for Super Admin.`,
      payout: updated,
    });
  } catch (err) {
    console.error('[RegionalPayouts] Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
