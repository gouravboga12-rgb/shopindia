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
 * Returns pending payout requests from merchants and riders in this regional admin's territory,
 * with support for scope=all to review unassigned platform-wide requests.
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { scope = 'territory' } = req.query;

    const profile = await prisma.regionalAdminProfile.findUnique({
      where: { userId },
      include: { branch: true },
    });

    const assignedPincodes = profile?.assignedPincodes || [];
    const branchId = profile?.branchId;
    const regionName = profile?.regionName || '';

    // Base query for pending/review/approved requests
    const where = {
      status: { in: ['pending', 'under_review', 'approved'] },
    };

    if (scope === 'territory') {
      const orConditions = [];
      if (branchId) {
        orConditions.push({ vendor: { branchId } });
        orConditions.push({ riderProfile: { branchId } });
      }
      if (assignedPincodes.length > 0) {
        orConditions.push({ vendor: { pincode: { in: assignedPincodes } } });
        // Use contains so full addresses with pincode are matched
        assignedPincodes.forEach((pin) => {
          if (pin && pin.trim()) {
            orConditions.push({ riderProfile: { address: { contains: pin.trim() } } });
          }
        });
      }

      // If territory has a region/city keyword (e.g. Hyderabad, Uppal, Bangalore)
      const cleanRegionKeywords = regionName
        .replace(/hub|mandal|zone|central|north|south|east|west|\(|\)/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4);

      cleanRegionKeywords.forEach((kw) => {
        orConditions.push({ vendor: { city: { contains: kw, mode: 'insensitive' } } });
        orConditions.push({ riderProfile: { address: { contains: kw, mode: 'insensitive' } } });
      });

      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    const [requests, totalInScope, totalPlatformPending] = await Promise.all([
      prisma.payoutRequest.findMany({
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
      }),
      prisma.payoutRequest.count({ where }),
      prisma.payoutRequest.count({ where: { status: { in: ['pending', 'under_review', 'approved'] } } }),
    ]);

    // Annotate whether each request is in this territory
    const annotated = requests.map((r) => {
      let isTerritory = false;
      const vPin = r.vendor?.pincode;
      const rAddr = r.riderProfile?.address || '';
      if (assignedPincodes.includes(vPin)) isTerritory = true;
      if (assignedPincodes.some((pin) => rAddr.includes(pin))) isTerritory = true;
      if (branchId && (r.vendor?.branchId === branchId || r.riderProfile?.branchId === branchId)) isTerritory = true;

      return {
        ...r,
        inTerritory: isTerritory,
      };
    });

    res.json({
      success: true,
      territory: profile?.regionName || 'My Region',
      assignedPincodes,
      scope,
      totalInScope,
      totalPlatformPending,
      requests: annotated,
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

module.exports = router;
