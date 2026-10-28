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

    // Check for any pending physical submission awaiting Regional Admin approval
    const pendingSubmission = await prisma.cODRemittance.findFirst({
      where: {
        riderProfileId: rider.id,
        status: 'pending',
        clearanceMode: 'physical',
        receivedByAdminAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Extract rider's pincode from address
    const pinMatch = (rider.address || '').match(/\b([1-9][0-9]{5})\b/);
    const riderPincode = pinMatch ? pinMatch[1] : null;

    // Determine regional admin availability
    let regionalAdminAvailable = false;
    let regionalAdminInfo = null;

    if (settings.allowRegionalCash) {
      // 1. Try branch assignment
      if (rider.branch?.regionalAdmins?.length > 0) {
        const activeAdmin = rider.branch.regionalAdmins[0];
        regionalAdminAvailable = true;
        regionalAdminInfo = {
          id: activeAdmin.id,
          name: activeAdmin.user?.name || 'Regional Hub Manager',
          phone: activeAdmin.user?.phone || null,
          email: activeAdmin.user?.email || null,
          hubName: rider.branch.name || rider.branch.city || activeAdmin.regionName,
          address: activeAdmin.address || (rider.branch.street ? `${rider.branch.street}, ${rider.branch.city}` : activeAdmin.regionName),
          currentLat: activeAdmin.currentLat || null,
          currentLng: activeAdmin.currentLng || null,
          district: activeAdmin.district || rider.branch.city,
          state: activeAdmin.state || rider.branch.state,
        };
      } else if (riderPincode) {
        // 2. Try pincode match across approved Regional Admins
        const matchedAdmin = await prisma.regionalAdminProfile.findFirst({
          where: {
            status: 'approved',
            assignedPincodes: { has: riderPincode },
          },
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
            branch: true,
          },
        });

        if (matchedAdmin) {
          regionalAdminAvailable = true;
          regionalAdminInfo = {
            id: matchedAdmin.id,
            name: matchedAdmin.user?.name || 'Regional Hub Manager',
            phone: matchedAdmin.user?.phone || null,
            email: matchedAdmin.user?.email || null,
            hubName: matchedAdmin.regionName || matchedAdmin.branch?.name || 'Regional Hub',
            address: matchedAdmin.address || (matchedAdmin.district ? `${matchedAdmin.regionName}, ${matchedAdmin.district}, ${matchedAdmin.state || ''}` : matchedAdmin.regionName),
            currentLat: matchedAdmin.currentLat || null,
            currentLng: matchedAdmin.currentLng || null,
            district: matchedAdmin.district,
            state: matchedAdmin.state,
          };
        }
      }
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
      riderPincode,
      deadlineRule: settings.deadlineRule,
      orderCountThreshold: settings.orderCountThreshold,
      regionalAdminAvailable,
      regionalAdmin: regionalAdminInfo,
      pendingSubmission: pendingSubmission
        ? {
            id: pendingSubmission.id,
            amount: pendingSubmission.amount,
            createdAt: pendingSubmission.createdAt,
            status: pendingSubmission.status,
          }
        : null,
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
          status: 'paid_online',
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
 * POST /api/rider/cod/submit-cash-to-hub
 * Rider submits collected offline cash directly to the Regional Admin (No OTP required).
 * Creates a pending remittance record awaiting Regional Admin confirmation.
 */
router.post('/submit-cash-to-hub', async (req, res) => {
  try {
    const rider = await prisma.riderProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: { select: { name: true, phone: true } },
        branch: {
          include: {
            regionalAdmins: { where: { status: 'approved' } },
          },
        },
      },
    });

    if (!rider) return res.status(404).json({ error: 'Rider not found.' });

    const floatToHandover = rider.codCashFloat || 0;
    if (floatToHandover <= 0) {
      return res.status(400).json({ error: 'You have zero floating cash to hand over.' });
    }

    // Determine regional admin (by branch or by pincode)
    let regionalAdmin = rider.branch?.regionalAdmins?.[0] || null;
    if (!regionalAdmin) {
      const pinMatch = (rider.address || '').match(/\b([1-9][0-9]{5})\b/);
      if (pinMatch) {
        regionalAdmin = await prisma.regionalAdminProfile.findFirst({
          where: {
            status: 'approved',
            assignedPincodes: { has: pinMatch[1] },
          },
          include: { user: { select: { name: true, phone: true } } },
        });
      }
    }

    if (!regionalAdmin) {
      return res.status(400).json({
        error: 'No Regional Admin is available in your territory. Please remit your cash float online via Razorpay / UPI.',
      });
    }

    // Check if an existing pending submission exists, update it or create new
    const existing = await prisma.cODRemittance.findFirst({
      where: {
        riderProfileId: rider.id,
        status: 'pending',
        clearanceMode: 'physical',
        receivedByAdminAt: null,
      },
    });

    let remittance;
    if (existing) {
      remittance = await prisma.cODRemittance.update({
        where: { id: existing.id },
        data: {
          amount: floatToHandover,
          regionalAdminId: regionalAdmin.id,
          notes: `Direct cash submission of ₹${floatToHandover} by ${rider.user.name} submitted for Regional Hub verification.`,
          updatedAt: new Date(),
        },
      });
    } else {
      remittance = await prisma.cODRemittance.create({
        data: {
          riderProfileId: rider.id,
          amount: floatToHandover,
          status: 'pending',
          clearanceMode: 'physical',
          regionalAdminId: regionalAdmin.id,
          notes: `Direct cash submission of ₹${floatToHandover} by ${rider.user.name} submitted for Regional Hub verification.`,
        },
      });
    }

    res.json({
      success: true,
      message: `Cash submission of ₹${floatToHandover} recorded! Please hand over physical cash to ${regionalAdmin.user?.name || 'Regional Hub Admin'}.`,
      remittanceId: remittance.id,
      amount: floatToHandover,
      regionalAdmin: {
        id: regionalAdmin.id,
        name: regionalAdmin.user?.name || 'Regional Hub Manager',
        phone: regionalAdmin.user?.phone,
        hubName: regionalAdmin.regionName || rider.branch?.name,
      },
    });
  } catch (err) {
    console.error('[Rider Submit Cash to Hub] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/cod/request-physical-handover
 * Legacy alias for submit-cash-to-hub (backward compatibility)
 */
router.post('/request-physical-handover', async (req, res) => {
  return res.redirect(307, '/api/rider/cod/submit-cash-to-hub');
});

module.exports = router;
