'use strict';
/**
 * server/routes/rider/cod.js
 * Rider Cash on Delivery (COD) Float & Clearance Endpoints.
 * Implements dual remittance: Online via Razorpay OR Physical Handover to Regional Admin.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { createRazorpayOrder, verifyPaymentSignature } = require('../../lib/razorpay');
const { postLedgerEntries } = require('../../lib/ledger');

router.use(verifyToken, requireRole('rider'));

/**
 * Helper to fetch platform COD settings
 */
async function getCODSettings() {
  const settings = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          'cod_deadline_rule',
          'cod_order_count_threshold',
          'cod_max_float_limit',
          'cod_allow_regional_cash',
          'cod_auto_pause_rider',
        ],
      },
    },
  });

  const map = {
    deadlineRule: 'end_of_day',
    orderCountThreshold: 3,
    maxFloatLimit: 3000,
    allowRegionalCash: true,
    autoPauseRider: true,
  };

  settings.forEach((s) => {
    if (s.key === 'cod_deadline_rule') map.deadlineRule = s.value;
    if (s.key === 'cod_order_count_threshold') map.orderCountThreshold = parseInt(s.value, 10) || 3;
    if (s.key === 'cod_max_float_limit') map.maxFloatLimit = parseFloat(s.value) || 3000;
    if (s.key === 'cod_allow_regional_cash') map.allowRegionalCash = s.value === 'true';
    if (s.key === 'cod_auto_pause_rider') map.autoPauseRider = s.value === 'true';
  });

  return map;
}

/**
 * GET /api/rider/cod/status
 * Returns the current rider's floating cash, clearance status, and available clearance modes.
 */
router.get('/status', async (req, res) => {
  try {
    const rider = await prisma.riderProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        branch: {
          include: {
            regionalAdmins: {
              where: { status: 'approved' },
              include: { user: { select: { id: true, name: true, phone: true, email: true } } },
            },
          },
        },
      },
    });

    if (!rider) return res.status(404).json({ error: 'Rider profile not found.' });

    const settings = await getCODSettings();

    // Check recent delivered COD deliveries
    const unremittedDeliveries = await prisma.delivery.findMany({
      where: {
        riderProfileId: rider.id,
        status: 'delivered',
        order: { paymentMethod: 'cod' },
      },
      select: {
        id: true,
        deliveryFee: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const unremittedCount = unremittedDeliveries.length;
    const floatAmount = rider.codCashFloat || 0;
    const floatLimit = rider.codFloatLimit || settings.maxFloatLimit;

    // Determine regional admin availability
    let regionalAdminAvailable = false;
    let regionalAdminInfo = null;

    if (settings.allowRegionalCash && rider.branch?.regionalAdmins?.length > 0) {
      const activeAdmin = rider.branch.regionalAdmins[0];
      regionalAdminAvailable = true;
      regionalAdminInfo = {
        id: activeAdmin.id,
        name: activeAdmin.user?.name || 'Regional Hub Manager',
        phone: activeAdmin.user?.phone,
        email: activeAdmin.user?.email,
        hubName: rider.branch.name || rider.branch.city,
      };
    }

    // Determine compliance and dispatch block
    let isBlocked = false;
    let warningMessage = null;

    if (floatAmount >= floatLimit) {
      isBlocked = true;
      warningMessage = `Cash float limit of ₹${floatLimit} exceeded. Please remit collected cash immediately to resume new orders.`;
    } else if (settings.deadlineRule === 'order_count' && unremittedCount >= settings.orderCountThreshold && floatAmount > 0) {
      isBlocked = true;
      warningMessage = `You have completed ${unremittedCount} consecutive COD orders. Please submit collected cash before accepting more orders.`;
    } else if (floatAmount > floatLimit * 0.75) {
      warningMessage = `Approaching maximum cash float limit (₹${floatAmount} / ₹${floatLimit}). Please prepare for remittance.`;
    }

    res.json({
      success: true,
      floatAmount,
      floatLimit,
      unremittedCount,
      deadlineRule: settings.deadlineRule,
      orderCountThreshold: settings.orderCountThreshold,
      regionalAdminAvailable,
      regionalAdmin: regionalAdminInfo,
      clearanceNotice: !regionalAdminAvailable
        ? 'No Regional Admin available in your area. Please pay and remit offline cash through Razorpay.'
        : 'You can submit offline cash physically to your Regional Admin or pay instantly via Razorpay.',
      isBlocked: settings.autoPauseRider && isBlocked,
      warningMessage,
      recentDeliveries: unremittedDeliveries,
    });
  } catch (err) {
    console.error('[Rider COD Status] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/cod/create-razorpay-order
 * Creates a Razorpay order for the rider to remit their COD cash float online.
 */
router.post('/create-razorpay-order', async (req, res) => {
  try {
    const rider = await prisma.riderProfile.findUnique({
      where: { userId: req.user.userId },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    if (!rider) return res.status(404).json({ error: 'Rider profile not found.' });

    const floatToRemit = rider.codCashFloat || 0;
    if (floatToRemit <= 0) {
      return res.status(400).json({ error: 'You have no floating cash to remit.' });
    }

    const rzpOrder = await createRazorpayOrder({
      amount: floatToRemit,
      currency: 'INR',
      receipt: `cod_remit_${rider.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        riderId: rider.id,
        riderName: rider.user.name,
        type: 'RIDER_COD_REMITTANCE',
      },
    });

    res.json({
      success: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
      rider: {
        name: rider.user.name,
        email: rider.user.email,
        phone: rider.user.phone,
      },
    });
  } catch (err) {
    console.error('[Rider COD Razorpay Order] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/cod/verify-razorpay-remittance
 * Verifies the Razorpay payment signature and clears the rider's cash float with an immutable ledger debit.
 */
router.post('/verify-razorpay-remittance', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature from Razorpay.' });
    }

    const rider = await prisma.riderProfile.findUnique({
      where: { userId: req.user.userId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!rider) return res.status(404).json({ error: 'Rider not found.' });

    const clearedAmount = rider.codCashFloat || 0;

    await prisma.$transaction(async (tx) => {
      // 1. Clear rider COD float
      await tx.riderProfile.update({
        where: { id: rider.id },
        data: { codCashFloat: 0 },
      });

      // 2. Insert completed CODRemittance
      await tx.cODRemittance.create({
        data: {
          riderProfileId: rider.id,
          amount: clearedAmount,
          status: 'remitted_to_super',
          clearanceMode: 'online',
          razorpayPaymentId,
          receivedByAdminAt: new Date(),
          remittedToSuperAt: new Date(),
          notes: `Cleared online via Razorpay (Payment ID: ${razorpayPaymentId})`,
        },
      });

      // 3. Post immutable ledger debit
      await postLedgerEntries(
        [
          {
            type: 'DEBIT',
            party: 'RIDER',
            partyId: rider.id,
            amount: clearedAmount,
            entryType: 'COD_REMITTANCE',
            description: `Online COD cash remittance via Razorpay by ${rider.user.name}`,
            metadata: {
              razorpayPaymentId,
              razorpayOrderId,
              timestamp: new Date().toISOString(),
            },
            riderProfileId: rider.id,
          },
        ],
        tx
      );
    });

    res.json({
      success: true,
      message: `Successfully cleared ₹${clearedAmount} COD cash float via Razorpay!`,
      clearedAmount,
    });
  } catch (err) {
    console.error('[Rider COD Verify] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/cod/request-physical-handover
 * Generates a physical cash handover request with a 4-digit verification OTP for the Regional Admin.
 */
router.post('/request-physical-handover', async (req, res) => {
  try {
    const rider = await prisma.riderProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        branch: {
          include: {
            regionalAdmins: { where: { status: 'approved' } },
          },
        },
      },
    });

    if (!rider) return res.status(404).json({ error: 'Rider not found.' });

    const regionalAdmin = rider.branch?.regionalAdmins?.[0];
    if (!regionalAdmin) {
      return res.status(400).json({
        error: 'No Regional Admin available in your area. Please pay through Razorpay.',
      });
    }

    const floatToHandover = rider.codCashFloat || 0;
    if (floatToHandover <= 0) {
      return res.status(400).json({ error: 'Zero cash in hand to submit.' });
    }

    // Generate 4-digit verification OTP
    const handoverOtp = String(Math.floor(1000 + Math.random() * 9000));

    const remittance = await prisma.cODRemittance.create({
      data: {
        riderProfileId: rider.id,
        amount: floatToHandover,
        status: 'pending',
        clearanceMode: 'physical',
        regionalAdminId: regionalAdmin.id,
        notes: `Physical submission requested. Handover OTP: ${handoverOtp}`,
      },
    });

    res.json({
      success: true,
      message: 'Physical cash submission initiated. Please share the handover OTP with your Regional Admin.',
      handoverOtp,
      remittanceId: remittance.id,
      amount: floatToHandover,
      regionalAdmin: {
        name: regionalAdmin.user?.name || 'Regional Lead',
        hubName: rider.branch?.name,
      },
    });
  } catch (err) {
    console.error('[Rider Physical Handover] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
