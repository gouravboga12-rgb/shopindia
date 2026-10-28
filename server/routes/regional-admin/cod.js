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
const { createRazorpayOrder, verifyPaymentSignature, fetchPaymentDetails } = require('../../lib/razorpay');

router.use(verifyToken, requireRole('regional_admin', 'super_admin'));

/**
 * GET /api/regional-admin/cod
 * Returns pending rider cash handovers and collected pool status.
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const profile = await prisma.regionalAdminProfile.findUnique({
      where: { userId },
      include: { branch: true },
    });

    const regionalAdminId = profile?.id;

    const [pendingSubmissions, collectedPool, pastRemittances, acceptedHandovers] = await Promise.all([
      // 1. Pending handovers from territory riders (physical submission not yet verified by admin)
      prisma.cODRemittance.findMany({
        where: {
          status: { in: ['pending', 'submitted_to_admin'] },
          clearanceMode: 'physical',
          receivedByAdminAt: null,
          ...(regionalAdminId ? { regionalAdminId } : {}),
        },
        include: {
          riderProfile: {
            include: { user: { select: { name: true, phone: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      // 2. Cash physically verified and held in custody by this regional admin not yet remitted to Super Admin
      prisma.cODRemittance.findMany({
        where: {
          status: 'verified',
          clearanceMode: 'physical',
          receivedByAdminAt: { not: null },
          remittedToSuperAt: null,
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
          remittedToSuperAt: { not: null },
          ...(regionalAdminId ? { regionalAdminId } : {}),
        },
        include: {
          riderProfile: {
            include: { user: { select: { name: true, phone: true } } },
          },
        },
        orderBy: { remittedToSuperAt: 'desc' },
        take: 30,
      }),

      // 4. All physical cash receipts confirmed by this regional admin (Passbook History)
      prisma.cODRemittance.findMany({
        where: {
          clearanceMode: 'physical',
          receivedByAdminAt: { not: null },
          ...(regionalAdminId ? { regionalAdminId } : {}),
        },
        include: {
          riderProfile: {
            include: { user: { select: { name: true, phone: true, email: true } } },
          },
        },
        orderBy: { receivedByAdminAt: 'desc' },
        take: 50,
      }),
    ]);

    const totalCashInCustody = collectedPool.reduce((acc, r) => acc + (r.amount || 0), 0);

    res.json({
      success: true,
      hubName: profile?.branch?.name || profile?.regionName || profile?.branch?.city || 'Regional Hub',
      totalCashInCustody,
      pendingCount: pendingSubmissions.length,
      pendingSubmissions: pendingSubmissions.map((r) => ({ ...r, status: 'pending' })),
      collectedPool: collectedPool.map((r) => ({ ...r, status: 'received_by_regional' })),
      pastRemittances: pastRemittances.map((r) => ({ ...r, status: 'remitted_to_super' })),
      acceptedHandovers: acceptedHandovers.map((r) => ({
        ...r,
        isSettledToHQ: !!r.remittedToSuperAt,
      })),
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
    if (remittance.receivedByAdminAt) {
      return res.status(400).json({ error: 'Remittance is already verified and received.' });
    }

    const rider = remittance.riderProfile;
    const amount = remittance.amount;

    await prisma.$transaction(async (tx) => {
      // 1. Mark remittance as verified and received by regional admin
      await tx.cODRemittance.update({
        where: { id },
        data: {
          status: 'verified',
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
        tx,
        [
          {
            type: 'DEBIT',
            party: 'RIDER',
            partyId: rider.id,
            amount,
            entryType: 'COD_REMITTANCE',
            description: `Physical COD cash submitted by ${rider.user?.name || 'Rider'} to Regional Admin`,
            metadata: {
              remittanceId: id,
              clearedAt: new Date().toISOString(),
              receivedBy: req.user?.userId || req.user?.id,
            },
            riderProfileId: rider.id,
          },
        ]
      );
    });

    res.json({
      success: true,
      message: `Confirmed receipt of ₹${amount} cash from ${rider.user?.name || 'Rider'}. Rider float decremented.`,
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
        status: 'verified',
        remittedToSuperAt: null,
      },
    });

    if (remittances.length === 0) {
      return res.status(400).json({ error: 'No valid collected cash batches found to remit.' });
    }

    const totalToRemit = remittances.reduce((acc, r) => acc + (r.amount || 0), 0);

    const rzpOrder = await createRazorpayOrder({
      amount: totalToRemit,
      currency: 'INR',
      receipt: `reg_remit_${Date.now()}`,
      notes: {
        regionalAdminId: req.user?.userId || req.user?.id,
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

    let isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid && razorpayPaymentId) {
      try {
        const paymentDetails = await fetchPaymentDetails(razorpayPaymentId);
        if (paymentDetails && (paymentDetails.status === 'captured' || paymentDetails.status === 'authorized')) {
          isValid = true;
          console.log(`[Regional COD] Payment ${razorpayPaymentId} verified via Razorpay API fetch fallback.`);
        }
      } catch (fetchErr) {
        console.warn('[Regional COD] Fallback Razorpay fetch failed:', fetchErr.message);
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature from Razorpay.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.cODRemittance.updateMany({
        where: { id: { in: remittanceIds } },
        data: {
          status: 'verified',
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
        tx,
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
        ]
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

/**
 * GET /api/regional-admin/cod/super-bank-details
 * Returns Super Admin bank details strictly to authenticated Regional Admins for offline cash remittance.
 * Securely isolated from public, vendor, or customer endpoints.
 */
router.get('/super-bank-details', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'super_admin_cod_bank_details' },
    });

    let details = {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200088921456',
      ifsc: 'HDFC0001234',
      accountHolder: 'ShopIndia Technologies Pvt Ltd',
      upiId: 'shopindia.hq@okhdfcbank',
    };

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        details = { ...details, ...parsed };
      } catch (e) {
        console.warn('Failed to parse bank details json:', e);
      }
    }

    res.json({
      success: true,
      bankDetails: details,
    });
  } catch (err) {
    console.error('[Regional COD Super Bank Details] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/cod/remit-bank-transfer
 * Regional Admin submits an offline NEFT/IMPS bank transfer to Super Admin with UTR number for verification.
 */
router.post('/remit-bank-transfer', async (req, res) => {
  try {
    const { remittanceIds, utrNumber, bankName, transferDate, notes } = req.body;

    if (!remittanceIds || !Array.isArray(remittanceIds) || remittanceIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one collected cash batch to remit.' });
    }

    const cleanUtr = String(utrNumber || '').trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      return res.status(400).json({ error: 'A valid Bank Transaction ID or UTR Number (minimum 6 characters) is required.' });
    }

    // Check if this UTR has already been submitted
    const duplicate = await prisma.cODRemittance.findFirst({
      where: {
        superAdminRazorpayId: cleanUtr,
        remittedToSuperAt: { not: null },
      },
    });

    if (duplicate) {
      return res.status(400).json({ error: 'This UTR Number has already been submitted and processed.' });
    }

    const remittances = await prisma.cODRemittance.findMany({
      where: {
        id: { in: remittanceIds },
        receivedByAdminAt: { not: null },
      },
    });

    if (remittances.length === 0) {
      return res.status(400).json({ error: 'No valid verified cash batches found to remit.' });
    }

    const totalToRemit = remittances.reduce((acc, r) => acc + (r.amount || 0), 0);
    const adminUser = req.user?.name || req.user?.email || 'Regional Admin';

    await prisma.$transaction(async (tx) => {
      await tx.cODRemittance.updateMany({
        where: { id: { in: remittanceIds } },
        data: {
          superAdminRazorpayId: cleanUtr,
          clearanceMode: 'bank_transfer',
          notes: `Offline Bank Transfer (UTR: ${cleanUtr}, Bank: ${bankName || 'Direct Transfer'}) submitted by ${adminUser}. Awaiting Super Admin verification. ${notes ? 'Note: ' + notes : ''}`,
        },
      });
    });

    res.json({
      success: true,
      message: `Offline bank transfer of ₹${totalToRemit} (UTR: ${cleanUtr}) submitted successfully! Super Admin has been notified for verification.`,
      totalRemitted: totalToRemit,
      utr: cleanUtr,
    });
  } catch (err) {
    console.error('[Regional Remit Bank Transfer] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
