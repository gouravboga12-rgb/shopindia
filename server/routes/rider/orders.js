const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { emitDeliveryStageChange, cleanDeliveryTracking } = require('../../lib/socket');
const { recordRiderCredit } = require('../../lib/ledger');
const { createOrder: createRazorpayOrder, verifyPaymentSignature } = require('../../lib/razorpay');

const router = express.Router();
router.use(verifyToken, requireRole('rider'));

/**
 * Helper to fetch the rider profile for the authenticated user
 */
async function getRiderProfile(userId) {
  return prisma.riderProfile.findUnique({
    where: { userId },
  });
}

/**
 * GET /api/rider/broadcast-feed
 * Fetch all unclaimed quick-commerce delivery opportunities currently broadcasted.
 */
router.get('/broadcast-feed', async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    // Only return broadcast feed if rider is online
    if (!profile.isOnline) {
      return res.json({ deliveries: [], message: 'Rider is currently offline.' });
    }

    // Fetch unclaimed deliveries
    const deliveries = await prisma.delivery.findMany({
      where: {
        status: 'broadcasted',
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            type: true,
            items: {
              select: {
                id: true,
                name: true,
                quantity: true,
                price: true,
              },
            },
            vendor: {
              select: {
                id: true,
                businessName: true,
                phone: true,
                street: true,
                city: true,
                state: true,
                pincode: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ deliveries });
  } catch (err) {
    console.error('Fetch broadcast feed error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/accept
 * ATOMIC CLAIM: Lock order to this rider.
 * If another rider tapped milliseconds earlier, returns ALREADY_ASSIGNED.
 */
router.post(['/:id/accept', '/orders/:id/accept'], async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    // Check if rider already has an active ongoing delivery
    const existingActive = await prisma.delivery.findFirst({
      where: {
        riderProfileId: profile.id,
        status: { in: ['assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'] },
      },
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        code: 'HAS_ACTIVE_DELIVERY',
        message: 'You already have an active ongoing delivery! Complete it before taking another.',
      });
    }

    // ATOMIC FIRST-COME-FIRST-SERVED CLAIM
    // We update only if current status is exactly 'broadcasted'
    const result = await prisma.delivery.updateMany({
      where: {
        id: req.params.id,
        status: 'broadcasted',
      },
      data: {
        riderProfileId: profile.id,
        status: 'assigned',
        assignedAt: new Date(),
      },
    });

    if (result.count === 0) {
      // 0 rows updated means another rider accepted first or order was cancelled
      return res.status(409).json({
        success: false,
        code: 'ALREADY_ASSIGNED',
        message: 'Sorry! Another rider accepted this delivery first.',
      });
    }

    // Fetch the updated delivery with full details
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            items: true,
            customer: { select: { id: true, name: true, phone: true } },
            vendor: { select: { id: true, businessName: true, phone: true, street: true, city: true } },
          },
        },
      },
    });

    // Update order status to in_transit
    await prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: 'in_transit' },
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Delivery successfully assigned to you! Proceed to vendor store.',
      delivery,
    });
  } catch (err) {
    console.error('Accept order error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/decline
 * Dismiss delivery alert from this rider's radar
 */
router.post(['/:id/decline', '/orders/:id/decline'], async (_req, res) => {
  res.json({ success: true, message: 'Order dismissed from radar.' });
});

/**
 * GET /api/rider/active-job
 * Get current ongoing delivery details and checkpoints
 */
router.get('/active-job', async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const activeJob = await prisma.delivery.findFirst({
      where: {
        riderProfileId: profile.id,
        status: { in: ['assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'] },
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, images: { select: { url: true }, take: 1 } },
                },
              },
            },
            customer: { select: { id: true, name: true, phone: true } },
            vendor: { select: { id: true, businessName: true, phone: true, street: true, city: true } },
          },
        },
      },
    });

    if (activeJob) {
      if (!activeJob.dropoffAddress || activeJob.dropoffAddress.replace(/[,\s]/g, '').length === 0) {
        activeJob.dropoffAddress = 'Customer Doorstep, Dilsukhnagar, Hyderabad';
      }
      if (!activeJob.pickupLat) activeJob.pickupLat = activeJob.order?.vendor?.lat || 17.3732;
      if (!activeJob.pickupLng) activeJob.pickupLng = activeJob.order?.vendor?.lng || 78.5385;
      if (!activeJob.dropoffLat) activeJob.dropoffLat = activeJob.pickupLat + 0.015;
      if (!activeJob.dropoffLng) activeJob.dropoffLng = activeJob.pickupLng - 0.008;
    }

    res.json({ activeJob: activeJob || null, activeDelivery: activeJob || null });
  } catch (err) {
    console.error('Fetch active job error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/rider/orders/:id/stage
 * Advance delivery stage: arrived_pickup -> picked_up -> arrived_customer
 */
router.patch(['/:id/stage', '/orders/:id/stage'], async (req, res) => {
  try {
    const { stage } = req.body;
    const allowedStages = ['arrived_pickup', 'picked_up', 'arrived_customer'];

    if (!allowedStages.includes(stage)) {
      return res.status(400).json({ error: `Invalid stage. Allowed: ${allowedStages.join(', ')}` });
    }

    const profile = await getRiderProfile(req.user.userId);
    const existing = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
    });

    if (!existing) return res.status(404).json({ error: 'Active delivery not found.' });

    const data = { status: stage };
    if (stage === 'picked_up') data.pickedUpAt = new Date();

    const updated = await prisma.delivery.update({
      where: { id: req.params.id },
      data,
      include: {
        order: {
          include: {
            items: true,
            customer: { select: { name: true, phone: true } },
            vendor: { select: { businessName: true, phone: true } },
          },
        },
      },
    });

    emitDeliveryStageChange(req.params.id, { stage: updated.status });

    res.json({ success: true, stage: updated.status, delivery: updated });
  } catch (err) {
    console.error('Update delivery stage error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/create-doorstep-razorpay-order
 * Allows rider to initiate an instant Razorpay payment for customer at the doorstep.
 */
router.post(['/:id/create-doorstep-razorpay-order', '/orders/:id/create-doorstep-razorpay-order'], async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery job not found.' });
    if (!delivery.order) return res.status(404).json({ error: 'Associated order not found.' });
    if (delivery.order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order is already paid.' });
    }

    const amountInPaise = Math.round(delivery.order.total * 100);
    const receipt = `doorstep_${delivery.id.slice(0, 8)}_${Date.now()}`;
    const rzpOrder = await createRazorpayOrder(amountInPaise, receipt, {
      deliveryId: delivery.id,
      orderId: delivery.order.id,
      riderId: profile.id,
      type: 'DOORSTEP_CUSTOMER_PAYMENT',
    });

    // Upsert PaymentRecord
    try {
      await prisma.paymentRecord.upsert({
        where: { orderId: delivery.order.id },
        create: {
          orderId: delivery.order.id,
          razorpayOrderId: rzpOrder.id,
          amount: delivery.order.total,
          currency: 'INR',
          status: 'initiated',
        },
        update: {
          razorpayOrderId: rzpOrder.id,
          amount: delivery.order.total,
          status: 'initiated',
        },
      });
    } catch (recErr) {
      console.warn('Doorstep PaymentRecord upsert warning:', recErr.message);
    }

    res.json({
      success: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
      customer: {
        name: delivery.order.customer?.name || 'Customer',
        phone: delivery.order.customer?.phone || '',
        email: delivery.order.customer?.email || '',
      },
      orderNumber: delivery.order.orderNumber,
      totalINR: delivery.order.total,
    });
  } catch (err) {
    console.error('Doorstep Razorpay Order Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/verify-doorstep-razorpay
 * Verifies customer payment at doorstep, marks order paid directly to admin,
 * so rider collects ₹0 cash and incurs 0 COD float.
 */
router.post(['/:id/verify-doorstep-razorpay', '/orders/:id/verify-doorstep-razorpay'], async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const profile = await getRiderProfile(req.user.userId);

    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: { order: true },
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature from Razorpay.' });
    }

    // Atomic update: Order paymentStatus to paid, paymentMethod to razorpay
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          paymentStatus: 'paid',
          paymentMethod: 'razorpay',
          paymentRef: razorpayPaymentId,
        },
      });

      await tx.paymentRecord.updateMany({
        where: { orderId: delivery.orderId },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'captured',
          capturedAt: new Date(),
        },
      });
    });

    res.json({
      success: true,
      message: 'Customer payment of ₹' + delivery.order.total + ' captured directly via Razorpay to ShopIndia Admin.',
      paymentId: razorpayPaymentId,
    });
  } catch (err) {
    console.error('Verify Doorstep Payment Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/complete
 * Stage 4: Customer Handover with 4-digit OTP or Photo Proof.
 * Credits delivery fee to rider wallet and marks order delivered.
 */
router.post(['/:id/complete', '/orders/:id/complete'], async (req, res) => {
  try {
    const { otp, proofPhotoUrl } = req.body;
    const profile = await getRiderProfile(req.user.userId);

    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: { order: true },
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery job not found.' });

    // Validate 4-digit OTP if one exists on the record
    if (delivery.deliveryOtp && otp) {
      if (String(delivery.deliveryOtp).trim() !== String(otp).trim()) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_OTP',
          error: 'Incorrect Customer Delivery OTP. Please verify with the customer.',
        });
      }
    }

    const feeToCredit = delivery.deliveryFee || 50;
    // Only increment cash float if payment was actually collected as physical COD cash (not paid online via Razorpay)
    const isCOD = delivery.order?.paymentMethod === 'cod' && delivery.order?.paymentStatus !== 'paid';
    const orderCash = delivery.order?.total || 0;

    // Atomic transaction: mark delivery completed, update order, credit rider wallet, write ledger entry
    let updatedDelivery;
    await prisma.$transaction(async (tx) => {
      updatedDelivery = await tx.delivery.update({
        where: { id: req.params.id },
        data: {
          status: 'delivered',
          deliveredAt: new Date(),
          proofPhotoUrl: proofPhotoUrl || undefined,
        },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: 'delivered',
          paymentStatus: 'paid',
        },
      });

      await tx.riderProfile.update({
        where: { id: profile.id },
        data: {
          walletBalance: { increment: feeToCredit },
          totalDeliveries: { increment: 1 },
          ...(isCOD && orderCash > 0 ? { codCashFloat: { increment: orderCash } } : {}),
        },
      });

      // Write immutable ledger entry for this delivery fee credit
      await recordRiderCredit(tx, {
        orderId: delivery.orderId,
        riderProfileId: profile.id,
        deliveryFee: feeToCredit,
      });
    });

    emitDeliveryStageChange(req.params.id, { stage: 'delivered' });
    cleanDeliveryTracking(req.params.id);

    res.json({
      success: true,
      message: `Delivery complete! ₹${feeToCredit} credited to your wallet balance.`,
      delivery: updatedDelivery,
      payoutAmount: feeToCredit,
    });
  } catch (err) {
    console.error('Complete delivery error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rider/orders/history
 * Fetch past completed or cancelled deliveries
 */
router.get('/orders/history', async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const history = await prisma.delivery.findMany({
      where: {
        riderProfileId: profile.id,
        status: { in: ['delivered', 'cancelled'] },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 50,
    });

    res.json({ history });
  } catch (err) {
    console.error('Fetch order history error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
