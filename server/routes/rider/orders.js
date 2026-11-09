const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { emitDeliveryStageChange, cleanDeliveryTracking } = require('../../lib/socket');
const { recordRiderCredit } = require('../../lib/ledger');
const { createOrder: createRazorpayOrder, verifyPaymentSignature } = require('../../lib/razorpay');

// Comprehensive dictionary of skill IDs to matching keywords, product synonyms, and stems
const SKILL_KEYWORDS = {
  plumbing: ['plumb', 'plumber', 'pipe', 'leak', 'tap', 'sink', 'drain', 'sanitary', 'faucet', 'motor', 'geyser', 'flush', 'water'],
  electrician: ['electr', 'wire', 'wiring', 'switch', 'light', 'fan', 'fuse', 'mcb', 'inverter', 'short circuit', 'appliance install', 'bulb', 'power'],
  ac_service: ['ac', 'air condition', 'hvac', 'cooling', 'compressor', 'gas refill', 'filter clean', 'jet wash', 'duct', 'split ac', 'window ac'],
  cleaning: ['clean', 'deep clean', 'disinfect', 'pest', 'pest control', 'sanitize', 'wash', 'mopping', 'sofa clean', 'kitchen clean', 'bathroom clean'],
  appliance_repair: ['appliance', 'washing machine', 'refrigerator', 'fridge', 'microwave', 'ro', 'purifier', 'water purifier', 'oven', 'chimney', 'dishwasher'],
  carpentry: ['carpent', 'wood', 'furniture', 'door', 'lock', 'hinge', 'bed', 'cabinet', 'shelf', 'drill'],
  painting: ['paint', 'painter', 'wall', 'waterproof', 'seepage', 'texture', 'distemper', 'primer'],
  salon_grooming: ['salon', 'groom', 'haircut', 'facial', 'massage', 'styling', 'beauty', 'spa', 'makeup', 'waxing', 'shave'],
  vehicle_care: ['car service', 'bike service', 'motorcycle', 'engine', 'oil change', 'tuning', 'vehicle periodic', 'periodic service', 'auto service', 'mechanic', 'brake oil'],
  vehicle_wash: ['wash', 'foam wash', 'car wash', 'bike wash', 'detailing', 'spa', 'pressure wash', 'vacuum'],
  vehicle_breakdown: ['tow', 'towing', 'breakdown', 'recovery', 'rsa', 'roadside', 'flatbed'],
  vehicle_battery: ['battery', 'jumpstart', 'jump start', 'voltage', 'car battery', 'bike battery'],
  vehicle_tyres: ['tyre', 'tire', 'wheel', 'brake', 'balancing', 'puncture', 'alignment'],
};

const router = express.Router();
router.use(verifyToken, requireRole('rider'));

/**
 * Helper to calculate Haversine distance in km between two GPS coordinates
 */
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 3.5;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

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
 * Fetch delivery & service opportunities broadcasted to this partner.
 * Isolated strictly by partnerType ('delivery' | 'service' | 'both'), skills, and service radius.
 */
router.get('/broadcast-feed', async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    // Only return broadcast feed if rider is online
    if (!profile.isOnline) {
      return res.json({ deliveries: [], message: 'Partner is currently offline.' });
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
            notes: true,
            deliveryLine1: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
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
      take: 40,
    });

    const partnerType = profile.partnerType || 'delivery';
    const riderLat = profile.currentLat;
    const riderLng = profile.currentLng;
    const maxRadius = profile.serviceRadiusKm || 25;

    // Filter by capability, skills, and geographic proximity
    const filteredDeliveries = deliveries.filter(del => {
      const isService = del.order?.type === 'hvac_service';

      // 1. Strict Vertical isolation:
      // Quick commerce riders NEVER see service jobs (delivery flow undisturbed)
      if (partnerType === 'delivery' && isService) return false;
      // Dedicated service technicians NEVER see grocery/shop deliveries
      if (partnerType === 'service' && !isService) return false;

      // 2. Skill Qualification for Technicians (if technician has skills defined)
      if (isService && profile.skills && profile.skills.length > 0) {
        const itemNames = (del.order?.items || []).map(i => (i.name || '').toLowerCase()).join(' ');
        const pickupStr = (del.pickupName || '').toLowerCase();
        const notesStr = (del.order?.notes || '').toLowerCase();
        const combinedText = `${pickupStr} ${itemNames} ${notesStr}`;

        const hasSkillMatch = profile.skills.some(skill => {
          const s = (skill || '').toLowerCase().trim();
          if (s === 'all' || s === 'all_round' || s === 'general') return true;
          const keywords = SKILL_KEYWORDS[s] || [s];
          return keywords.some(kw => combinedText.includes(kw));
        });

        if (!hasSkillMatch && !profile.skills.includes('general') && !profile.skills.includes('all')) {
          return false;
        }
      }

      // 3. Proximity / Service Radius Check
      if (riderLat && riderLng && del.pickupLat && del.pickupLng) {
        const dist = calculateHaversineDistanceKm(riderLat, riderLng, del.pickupLat, del.pickupLng);
        if (dist > maxRadius) return false;
      }

      return true;
    });

    res.json({ deliveries: filteredDeliveries });
  } catch (err) {
    console.error('Fetch broadcast feed error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/accept
 * ATOMIC CLAIM: Lock order to this rider/technician.
 * - Prevents multiple ongoing quick-commerce deliveries
 * - Prevents time-slot conflicts for scheduled services ("You already got a service order for tomorrow at this particular time. We can't accept this.")
 */
router.post(['/:id/accept', '/orders/:id/accept'], async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    // Fetch target delivery to inspect fulfillment type
    const targetDelivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          select: {
            id: true,
            type: true,
            notes: true,
          },
        },
      },
    });

    if (!targetDelivery) {
      return res.status(404).json({ success: false, error: 'Delivery job not found.' });
    }

    const isServiceJob = targetDelivery.order?.type === 'hvac_service';

    if (!isServiceJob) {
      // Check if rider already has an active ongoing quick delivery
      const existingActive = await prisma.delivery.findFirst({
        where: {
          riderProfileId: profile.id,
          status: { in: ['assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'] },
          order: { type: { not: 'hvac_service' } },
        },
      });

      if (existingActive) {
        return res.status(400).json({
          success: false,
          code: 'HAS_ACTIVE_DELIVERY',
          message: 'You already have an active ongoing delivery! Complete it before taking another.',
        });
      }
    } else {
      // Time-Slot Conflict Check for Service Jobs
      const targetSlot = (targetDelivery.order?.notes || targetDelivery.pickupAddress || '').toLowerCase();

      const existingServiceJobs = await prisma.delivery.findMany({
        where: {
          riderProfileId: profile.id,
          status: { in: ['assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'] },
          order: { type: 'hvac_service' },
        },
        include: { order: true },
      });

      const hasConflict = existingServiceJobs.some(job => {
        const existingSlot = (job.order?.notes || job.pickupAddress || '').toLowerCase();
        if (!targetSlot || !existingSlot) return false;
        if (targetSlot.trim() === existingSlot.trim()) return true;

        const targetParts = targetSlot.split('at');
        const existingParts = existingSlot.split('at');
        if (targetParts.length > 1 && existingParts.length > 1) {
          const tDate = targetParts[0].trim();
          const eDate = existingParts[0].trim();
          const tTime = targetParts[1].trim().slice(0, 5);
          const eTime = existingParts[1].trim().slice(0, 5);
          if (tDate === eDate && tTime === eTime) return true;
        }
        return false;
      });

      if (hasConflict) {
        return res.status(400).json({
          success: false,
          code: 'SLOT_CONFLICT',
          message: "You already got a service order for tomorrow at this particular time. We can't accept this.",
        });
      }
    }

    // ATOMIC FIRST-COME-FIRST-SERVED CLAIM
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
      return res.status(409).json({
        success: false,
        code: 'ALREADY_ASSIGNED',
        message: 'Sorry! Another technician/rider accepted this opportunity first.',
      });
    }

    // Update ServiceJob status if applicable
    if (isServiceJob) {
      await prisma.serviceJob.updateMany({
        where: { orderId: targetDelivery.orderId },
        data: { status: 'scheduled' },
      }).catch(() => {});
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

    // Update order status
    await prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: isServiceJob ? 'confirmed' : 'in_transit' },
    }).catch(() => {});

    res.json({
      success: true,
      message: isServiceJob
        ? 'Service job scheduled and assigned to your roster!'
        : 'Delivery successfully assigned to you! Proceed to vendor store.',
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
 * Get current ongoing delivery details and checkpoints.
 * Future scheduled service appointments (e.g. tomorrow) do not hijack this screen.
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
      // If this is a Glacons doorstep service
      if (activeJob.order?.type === 'hvac_service') {
        const isAlreadyEnRoute = activeJob.status === 'picked_up' || activeJob.status === 'arrived_customer';
        if (!isAlreadyEnRoute) {
          const notes = (activeJob.order?.notes || activeJob.pickupAddress || '').toLowerCase();
          const isInstant = notes.includes('instant');

          // If NOT an emergency instant match, scheduled appointments stay in the Scheduled Services roster
          // until the technician explicitly taps "Start Trip" (which advances status to picked_up)
          if (!isInstant) {
            return res.json({ activeJob: null, activeDelivery: null, isScheduledUpcoming: true, scheduledDelivery: activeJob });
          }
        }
      }

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
 * POST /api/rider/orders/:id/start-service
 * Technician explicitly begins travel to customer site for a scheduled service appointment.
 * Advances status to 'picked_up' (en route to customer site, bypassing store pickup).
 */
router.post(['/:id/start-service', '/orders/:id/start-service'], async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: { order: true },
    });

    if (!delivery) return res.status(404).json({ error: 'Assigned service job not found.' });

    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'picked_up', // En route to customer doorstep
        pickedUpAt: new Date(),
      },
      include: {
        order: {
          include: {
            items: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    res.json({ success: true, message: 'En route to customer site!', delivery: updated });
  } catch (err) {
    console.error('Start service error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/verify-service-otp
 * Verifies customer 4-digit PIN when technician arrives at customer doorstep to start work
 */
router.post(['/:id/verify-service-otp', '/orders/:id/verify-service-otp'], async (req, res) => {
  try {
    const { otp } = req.body;
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: { order: true },
    });

    if (!delivery) return res.status(404).json({ error: 'Service job not found.' });

    if (delivery.deliveryOtp && otp) {
      if (String(delivery.deliveryOtp).trim() !== String(otp).trim()) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_OTP',
          error: 'Incorrect Customer Service OTP. Please ask the customer for their 4-digit start PIN.',
        });
      }
    }

    res.json({ success: true, message: 'OTP verified. Service work authorized!' });
  } catch (err) {
    console.error('Verify service OTP error:', err);
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
 * GET /api/rider/orders/:id/doorstep-payment-info
 * Returns dynamic UPI QR details and payment link for doorstep collection.
 */
router.get(['/:id/doorstep-payment-info', '/orders/:id/doorstep-payment-info'], async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    if (!delivery || !delivery.order) return res.status(404).json({ error: 'Order not found' });

    const upiVpa = process.env.COMPANY_UPI_VPA || 'shopindia36@icici';
    const upiName = 'ShopIndia';
    const orderNo = delivery.order.orderNumber || delivery.order.id.slice(0, 8);
    const total = delivery.order.total;
    const upiLink = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR&tn=Order_${orderNo}&tr=${delivery.id}`;

    res.json({
      success: true,
      total,
      orderNumber: orderNo,
      token: orderNo.replace(/^OD-/, '').slice(-4),
      upiVpa,
      upiName,
      upiLink,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(upiLink)}`,
      paymentStatus: delivery.order.paymentStatus,
      paymentMethod: delivery.order.paymentMethod,
    });
  } catch (err) {
    console.error('Fetch Doorstep Payment Info Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/confirm-doorstep-upi
 * Rider confirms customer scanned dynamic UPI QR code and paid directly to ShopIndia.
 * Marks order paid, so rider collects ₹0 offline cash and keeps ₹0 COD float.
 */
router.post(['/:id/confirm-doorstep-upi', '/orders/:id/confirm-doorstep-upi'], async (req, res) => {
  try {
    const { upiRef } = req.body;
    const profile = await getRiderProfile(req.user.userId);

    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: { order: true },
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery not found.' });

    const ref = upiRef || `UPI-QR-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          paymentStatus: 'paid',
          paymentMethod: 'upi_qr',
          paymentRef: ref,
        },
      });

      await tx.paymentRecord.upsert({
        where: { orderId: delivery.orderId },
        create: {
          orderId: delivery.orderId,
          razorpayPaymentId: ref,
          amount: delivery.order.total,
          currency: 'INR',
          status: 'captured',
          capturedAt: new Date(),
        },
        update: {
          razorpayPaymentId: ref,
          status: 'captured',
          capturedAt: new Date(),
        },
      });
    });

    res.json({
      success: true,
      message: `Customer payment of ₹${delivery.order.total} verified via UPI QR.`,
      paymentId: ref,
    });
  } catch (err) {
    console.error('Confirm Doorstep UPI Error:', err);
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
    const { otp, proofPhotoUrl, paymentCollectedVia } = req.body;
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
    
    // Determine whether payment was collected as physical cash
    // If rider explicitly confirmed 'razorpay', 'upi_qr', 'online', or order is already marked paid online, zero cash float is added
    let isCollectedCash = false;
    if (delivery.order?.paymentMethod === 'cod') {
      if (
        paymentCollectedVia === 'razorpay' ||
        paymentCollectedVia === 'upi_qr' ||
        paymentCollectedVia === 'online' ||
        delivery.order?.paymentStatus === 'paid'
      ) {
        isCollectedCash = false;
      } else if (paymentCollectedVia === 'cash') {
        isCollectedCash = true;
      } else {
        isCollectedCash = delivery.order?.paymentStatus !== 'paid';
      }
    }
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

      // Unified Net Wallet Auto-Offset Architecture (Industry Standard):
      // - The rider earns feeToCredit on every delivery.
      // - If rider collected offline cash (COD), they pocket the physical cash (orderCash).
      // - Net wallet change = isCollectedCash ? (feeToCredit - orderCash) : feeToCredit.
      // - As rider completes subsequent deliveries, their earnings (+65, +150) dynamically
      //   pay down any negative balance.
      // - When resulting balance is >= 0, all cash liability is 100% RECOVERED (codCashFloat = 0).
      // - When balance is negative, codCashFloat is strictly the remaining unrecovered float.
      const netWalletChange = isCollectedCash && orderCash > 0
        ? (feeToCredit - orderCash)
        : feeToCredit;

      const currentBalance = Number(profile.walletBalance) || 0;
      const newCalculatedBalance = currentBalance + netWalletChange;
      const newFloat = newCalculatedBalance < 0 ? Math.round(Math.abs(newCalculatedBalance) * 100) / 100 : 0;

      await tx.riderProfile.update({
        where: { id: profile.id },
        data: {
          walletBalance: { increment: netWalletChange },
          totalDeliveries: { increment: 1 },
          codCashFloat: newFloat,
        },
      });

      // If physical cash was collected, log COD_COLLECTION entry in ledger
      if (isCollectedCash && orderCash > 0) {
        await tx.ledgerEntry.create({
          data: {
            type: 'DEBIT',
            party: 'RIDER',
            partyId: profile.id,
            amount: orderCash,
            entryType: 'COD_COLLECTION',
            orderId: delivery.orderId,
            description: `Doorstep offline cash collected for Order #${delivery.order?.orderNumber || delivery.orderId}`,
            riderProfileId: profile.id,
          },
        }).catch(err => console.warn('[RiderOrders] Ledger COD debit warning:', err.message));
      }

      // Write immutable ledger entry for this delivery fee credit
      await recordRiderCredit(tx, {
        orderId: delivery.orderId,
        riderProfileId: profile.id,
        deliveryFee: feeToCredit,
      });

      // Credit Vendor Wallet (Vendor Net Model: Vendor receives 100% of product price)
      if (delivery.order?.vendorId) {
        const orderForVendor = await tx.order.findUnique({
          where: { id: delivery.orderId },
          include: { items: true }
        });
        if (orderForVendor) {
          const vendorEarning = orderForVendor.items?.reduce(
            (sum, it) => sum + ((it.price || it.basePrice || 0) * (it.quantity || 1)),
            0
          ) || (orderForVendor.total || 0);

          if (vendorEarning > 0) {
            await tx.vendor.update({
              where: { id: delivery.order.vendorId },
              data: { walletBalance: { increment: vendorEarning } }
            });

            await tx.orderItem.updateMany({
              where: { orderId: delivery.orderId },
              data: { vendorPaidOut: true }
            });

            await tx.ledgerEntry.create({
              data: {
                type: 'CREDIT',
                party: 'VENDOR',
                partyId: delivery.order.vendorId,
                amount: vendorEarning,
                entryType: 'VENDOR_CREDIT',
                orderId: delivery.orderId,
                description: `Vendor 100% payout credit for delivered Order #${orderForVendor.orderNumber || delivery.orderId}`
              }
            }).catch(err => console.warn('[RiderOrders] Vendor ledger warning:', err.message));
          }
        }
      }
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
router.get(['/history', '/orders/history'], async (req, res) => {
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

    const formattedHistory = history.map((d) => ({
      ...d,
      orderNumber: d.order?.orderNumber || d.orderId,
    }));

    res.json({ history: formattedHistory });
  } catch (err) {
    console.error('Fetch order history error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rider/scheduled-services
 * Returns upcoming scheduled service bookings accepted by this technician.
 * Grouped into TODAY, TOMORROW, and UPCOMING.
 */
router.get(['/scheduled-services', '/orders/scheduled-services'], async (req, res) => {
  try {
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const deliveries = await prisma.delivery.findMany({
      where: {
        riderProfileId: profile.id,
        status: { in: ['assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'] },
        order: { type: 'hvac_service' },
      },
      include: {
        order: {
          include: {
            items: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const nowIST = new Date(Date.now() + 5.5 * 3600 * 1000);
    const todayStr = nowIST.toISOString().split('T')[0];
    const tomorrowIST = new Date(nowIST.getTime() + 24 * 3600 * 1000);
    const tomorrowStr = tomorrowIST.toISOString().split('T')[0];

    const todayList = [];
    const tomorrowList = [];
    const upcomingList = [];

    deliveries.forEach((del) => {
      const notes = (del.order?.notes || del.pickupAddress || '').toLowerCase();
      if (notes.includes('today') || notes.includes(todayStr)) {
        todayList.push(del);
      } else if (notes.includes('tomorrow') || notes.includes(tomorrowStr)) {
        tomorrowList.push(del);
      } else {
        upcomingList.push(del);
      }
    });

    res.json({
      success: true,
      services: deliveries,
      grouped: {
        today: todayList,
        tomorrow: tomorrowList,
        upcoming: upcomingList,
      },
    });
  } catch (err) {
    console.error('Fetch scheduled services error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/cancel-service
 * Mandatory cancellation reason prompt.
 * If cancelled before scheduled time: automatically re-broadcasts with [URGENT REPLACEMENT] tag.
 * If slot expired / unreached: cancels and initiates customer refund.
 */
router.post(['/:id/cancel-service', '/orders/:id/cancel-service'], async (req, res) => {
  try {
    const { reason, isExpired } = req.body;
    if (!reason || String(reason).trim().length < 5) {
      return res.status(400).json({
        error: 'A specific explanation/reason (at least 5 characters) is mandatory to cancel a service appointment.',
      });
    }

    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: { order: true },
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Assigned service appointment not found.' });
    }

    const cleanReason = String(reason).trim();
    const cancellationLog = `[Technician Cancellation - ${new Date().toLocaleDateString('en-IN')}]: ${cleanReason}`;
    const updatedNotes = delivery.order?.notes ? `${delivery.order.notes}\n${cancellationLog}` : cancellationLog;

    if (isExpired) {
      // Mark as unreached / expired slot -> initiate customer refund
      await prisma.$transaction([
        prisma.order.update({
          where: { id: delivery.orderId },
          data: {
            status: 'cancelled',
            refundReason: `Service Member Unavailable (Slot Expired): ${cleanReason}`,
            refundAmount: delivery.order?.total || 0,
            refundedAt: new Date(),
            notes: updatedNotes,
          },
        }),
        prisma.delivery.update({
          where: { id: delivery.id },
          data: { status: 'cancelled' },
        }),
      ]);

      return res.json({
        success: true,
        message: 'Service appointment cancelled. Customer refund has been registered.',
        status: 'cancelled',
      });
    } else {
      // Automatic Re-Broadcast for replacement technician
      const urgentPickupName = delivery.pickupName.startsWith('[URGENT REPLACEMENT]')
        ? delivery.pickupName
        : `[URGENT REPLACEMENT] ${delivery.pickupName}`;

      await prisma.$transaction([
        prisma.delivery.update({
          where: { id: delivery.id },
          data: {
            riderProfileId: null,
            status: 'broadcasted',
            pickupName: urgentPickupName,
            assignedAt: null,
          },
        }),
        prisma.order.update({
          where: { id: delivery.orderId },
          data: {
            notes: updatedNotes,
            status: 'placed',
          },
        }),
      ]);

      return res.json({
        success: true,
        message: 'Service appointment cancelled. Order has been automatically re-broadcasted for a replacement technician.',
        status: 'broadcasted',
      });
    }
  } catch (err) {
    console.error('Cancel service appointment error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/orders/:id/cancel-active
 * Allows assigned rider to cancel an ongoing delivery/job if unable to complete.
 * Unbinds the rider, resets status to 'broadcasted', and immediately rebroadcasts to nearby fleet.
 */
router.post(['/:id/cancel-active', '/orders/:id/cancel-active'], async (req, res) => {
  try {
    const { reason } = req.body;
    const profile = await getRiderProfile(req.user.userId);
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderProfileId: profile.id },
      include: { order: true },
    });

    if (!delivery) {
      return res.status(404).json({ error: 'Active assigned delivery not found.' });
    }

    const cleanReason = String(reason || 'Rider reported emergency / unable to reach').trim();
    const updatedNotes = delivery.order?.notes
      ? `${delivery.order.notes}\n[Rider Cancelled]: ${cleanReason}`
      : `[Rider Cancelled]: ${cleanReason}`;

    const urgentPickupName = delivery.pickupName.startsWith('[RE-BROADCAST]')
      ? delivery.pickupName
      : `[RE-BROADCAST] ${delivery.pickupName}`;

    await prisma.$transaction([
      prisma.delivery.update({
        where: { id: delivery.id },
        data: {
          riderProfileId: null,
          status: 'broadcasted',
          pickupName: urgentPickupName,
          assignedAt: null,
        },
      }),
      prisma.order.update({
        where: { id: delivery.orderId },
        data: {
          status: 'placed',
          notes: updatedNotes,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Delivery successfully cancelled and re-broadcasted to nearby partners.',
      status: 'broadcasted',
    });
  } catch (err) {
    console.error('Cancel active delivery error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
