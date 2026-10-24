'use strict';
/**
 * server/routes/regional-admin/cod.js
 * Regional Admin Territory Cash Collection & Super Admin Remittance Queue.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { postLedgerEntries } = require('../../lib/ledger');
const { createRazorpayOrder, verifyPaymentSignature } = require('../../lib/razorpay');

router.use(verifyToken, requireRole('regional_admin', 'super_admin'));

/**
 * GET /api/regional-admin/cod
 * Returns pending rider cash handovers and collected pool status.
 */
router.get('/', async (req, res) => {
  try {
    const profile = await prisma.regionalAdminProfile.findUnique({
      where: { userId: req.user.userId },
      include: { branch: true },
    });

    const regionalAdminId = profile?.id;
    const branchId = profile?.branchId;

    const [pendingSubmissions, collectedPool, pastRemittances] = await Promise.all([
      // 1. Pending handovers from territory riders
      prisma.cODRemittance.findMany({
        where: {
          status: 'pending',
          clearanceMode: 'physical',
          ...(regionalAdminId ? { regionalAdminId } : {}),
        },
        include: {
          riderProfile: {
            include: { user: { select: { name: true, phone: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Cash physically held by this regional admin not yet remitted to Super Admin
      prisma.cODRemittance.findMany({
        where: {
          status: 'received_by_regional',
          clearanceMode: 'physical',
          ...(regionalAdminId ? { regionalAdminId } : {}),
        },
        include: {
          riderProfile: {
            include: { user: { select: { name: true, phone: true } } },
          },
        },
        orderBy: { receivedByAdminAt: 'desc' },
      }),

      // 3. Past completed remittances to Super Admin
      prisma.cODRemittance.findMany({
        where: {
          status: 'remitted_to_super',
          ...(regionalAdminId ? { regionalAdminId } : {}),
        },
        orderBy: { remittedToSuperAt: 'desc' },
        take: 20,
      }),
    ]);

    const totalCashInCustody = collectedPool.reduce((acc, r) => acc + r.amount, 0);

    res.json({
      success: true,
      hubName: profile?.branch?.name || profile?.branch?.city || 'Regional Hub',
      totalCashInCustody,
      pendingCount: pendingSubmissions.length,
      pendingSubmissions,
      collectedPool,
      pastRemittances,
    });
  } catch (err) {
    console.error('[Regional Admin COD] Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/cod/:id/confirm-receipt
 * Regional Admin confirms physical receipt of offline cash from a delivery rider.
 */
router.post('/:id/confirm-receipt', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const remittance = await prisma.cODRemittance.findUnique({
      where: { id },
      include: {
        riderProfile: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!remittance) return res.status(404).json({ error: 'Remittance record not found.' });
    if (remittance.status !== 'pending') {
      return res.status(400).json({ error: `Remittance is already ${remittance.status}.` });
    }

    const rider = remittance.riderProfile;
    const amount = remittance.amount;

    await prisma.$transaction(async (tx) => {
      // 1. Mark remittance as received by regional admin
      await tx.cODRemittance.update({
        where: { id },
        data: {
          status: 'received_by_regional',
          receivedByAdminAt: new Date(),
          notes: notes?.trim() || remittance.notes,
        },
      });

      // 2. Decrement rider's codCashFloat
      await tx.riderProfile.update({
        where: { id: rider.id },
        data: {
          codCashFloat: { decrement: amount },
        },
      });

      // 3. Post double-entry ledger entry transferring custody liability to Regional Admin
      await postLedgerEntries(
        [
          {
            type: 'DEBIT',
            party: 'RIDER',
            partyId: rider.id,
            amount,
            entryType: 'COD_REMITTANCE',
            description: `Physical COD cash submitted by ${rider.user?.name} to Regional Admin`,
            metadata: {
              remittanceId: id,
              clearedAt: new Date().toISOString(),
              receivedBy: req.user.userId,
            },
            riderProfileId: rider.id,
          },
        ],
        tx
      );
    });

    res.json({
      success: true,
      message: `Confirmed receipt of ₹${amount} cash from ${rider.user?.name}. Rider float decremented.`,
    });
  } catch (err) {
    console.error('[Regional Admin Confirm Cash] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/cod/create-super-remittance-order
 * Regional Admin creates a Razorpay payment order to transfer the collected cash pool to Super Admin.
 */
router.post('/create-super-remittance-order', async (req, res) => {
  try {
    const { remittanceIds } = req.body;

    if (!remittanceIds || !Array.isArray(remittanceIds) || remittanceIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one remittance batch to remit.' });
    }

    const remittances = await prisma.cODRemittance.findMany({
      where: {
        id: { in: remittanceIds },
        status: 'received_by_regional',
      },
    });

    if (remittances.length === 0) {
      return res.status(400).json({ error: 'No valid collected cash batches found to remit.' });
    }

    const totalToRemit = remittances.reduce((acc, r) => acc + r.amount, 0);

    const rzpOrder = await createRazorpayOrder({
      amount: totalToRemit,
      currency: 'INR',
      receipt: `reg_remit_${Date.now()}`,
      notes: {
        regionalAdminId: req.user.userId,
        remittanceCount: remittances.length,
        type: 'REGIONAL_ADMIN_COD_REMITTANCE',
      },
    });

    res.json({
      success: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      totalINR: totalToRemit,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
      remittanceIds,
    });
  } catch (err) {
    console.error('[Regional Remittance Razorpay Order] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/cod/verify-super-remittance
 * Verifies Razorpay payment signature and marks cash batches as remitted to Super Admin.
 */
router.post('/verify-super-remittance', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, remittanceIds } = req.body;

    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature from Razorpay.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cODRemittance.updateMany({
        where: { id: { in: remittanceIds } },
        data: {
          status: 'remitted_to_super',
          remittedToSuperAt: new Date(),
          superAdminRazorpayId: razorpayPaymentId,
        },
      });

      // Post platform ledger credit
      const remittedTotal = (
        await tx.cODRemittance.findMany({
          where: { id: { in: remittanceIds } },
          select: { amount: true },
        })
      ).reduce((acc, r) => acc + r.amount, 0);

      await postLedgerEntries(
        [
          {
            type: 'CREDIT',
            party: 'PLATFORM',
            partyId: 'SUPER_ADMIN',
            amount: remittedTotal,
            entryType: 'COD_REMITTANCE',
            description: `Regional Admin bulk COD remittance of ₹${remittedTotal} received at HQ via Razorpay`,
            metadata: {
              razorpayPaymentId,
              razorpayOrderId,
              regionalAdminUserId: req.user.userId,
              timestamp: new Date().toISOString(),
            },
          },
        ],
        tx
      );
    });

    res.json({
      success: true,
      message: 'Successfully remitted cash pool to Super Admin nodal account via Razorpay!',
    });
  } catch (err) {
    console.error('[Regional Remittance Verify] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
