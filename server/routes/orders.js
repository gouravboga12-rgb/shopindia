const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const customerAuth = require('../middleware/customerAuth');
const { calculateItemPricing, calculateDeliveryPricing, calculateCartTotals, getCachedRules } = require('../lib/pricing');
const { verifyPaymentSignature } = require('../lib/razorpay');
const { getPlatformOperatingStatus } = require('../lib/operatingHours');
const { notifyNewOrder, notifyOrderStatus } = require('../lib/socket');

const router = express.Router();

function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 3.5;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.5, Math.round(R * c * 10) / 10);
}

function mapType(vertical) {
  switch (vertical) {
    case 'quick': return 'quick_commerce';
    case 'services': return 'hvac_service';
    default: return 'traditional';
  }
}

/** GET /api/orders/operating-status — Public live schedule, midnight blackout, and Friday prayer break status */
router.get(['/operating-status', '/platform/operating-status'], async (req, res) => {
  try {
    const { settings } = await getCachedRules();
    const operatingStatus = getPlatformOperatingStatus(settings);
    res.json({ success: true, operatingStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/orders/pricing-config — Public dynamic checkout settings */
router.get('/pricing-config', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const { settings } = await getCachedRules();
    const operatingStatus = getPlatformOperatingStatus(settings);
    res.json({
      success: true,
      operatingStatus,
      settings: {
        shiprocket_base_fee: parseFloat(settings['shiprocket_base_fee'] || 49),
        shiprocket_free_delivery_enabled: String(settings['shiprocket_free_delivery_enabled']) === 'true',
        shiprocket_free_threshold: parseFloat(settings['shiprocket_free_threshold'] || 499),
        quick_customer_base_fee: parseFloat(settings['quick_customer_base_fee'] || 35),
        quick_customer_per_km: parseFloat(settings['quick_customer_per_km'] || 7),
        quick_free_delivery_enabled: String(settings['quick_free_delivery_enabled']) === 'true',
        quick_free_threshold: parseFloat(settings['quick_free_threshold'] || 999),
        service_visit_charge: parseFloat(settings['service_visit_charge'] || 199),
        gst_percent: parseFloat(settings['gst_percent'] || 18),
        cgst_percent: parseFloat(settings['cgst_percent'] || 9),
        sgst_percent: parseFloat(settings['sgst_percent'] || 9),
        platform_charge_pct: parseFloat(settings['platform_charge_pct'] || 3.0),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/orders/quote — Real-time dynamic checkout bill calculation */
router.post('/quote', async (req, res) => {
  try {
    const { items = [], vertical = 'traditional', latitude, longitude, addressId } = req.body || {};
    
    let userLat = latitude ? parseFloat(latitude) : null;
    let userLng = longitude ? parseFloat(longitude) : null;
    if ((!userLat || !userLng) && addressId) {
      try {
        const addr = await prisma.address.findUnique({ where: { id: addressId } });
        if (addr) {
          userLat = addr.latitude || userLat;
          userLng = addr.longitude || userLng;
        }
      } catch (_) {}
    }

    const productIds = items.map(i => i.productId).filter(Boolean);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        basePrice: true,
        vendorId: true,
        categoryId: true,
        fulfillmentType: true,
        category: { select: { vertical: true, name: true } }
      }
    });
    const pMap = new Map(products.map(p => [p.id, p]));

    const resolved = items.map(it => {
      const p = pMap.get(it.productId);
      const catV = (p?.category?.vertical || '').toLowerCase();
      let itemChannel = p?.fulfillmentType;
      if (!itemChannel || itemChannel === 'traditional') {
        if (catV === 'quick' || catV === 'quick_commerce') {
          itemChannel = 'quick_commerce';
        } else if (catV === 'services' || catV === 'hvac_service' || catV === 'hvac') {
          itemChannel = 'hvac_service';
        } else {
          itemChannel = 'traditional';
        }
      }
      return {
        productId: it.productId,
        vendorId: p?.vendorId || it.vendorId,
        categoryId: p?.categoryId || it.categoryId,
        price: p?.basePrice || it.price || 0,
        quantity: it.quantity || 1,
        fulfillmentType: itemChannel,
        vertical: catV || (itemChannel === 'hvac_service' ? 'services' : itemChannel === 'quick_commerce' ? 'quick' : 'shop')
      };
    });

    // Partition items by channel and vendor store for accurate multi-order quotation
    const itemGroups = new Map();
    for (const it of resolved) {
      const channel = it.fulfillmentType || 'traditional';
      const gKey = channel === 'hvac_service'
        ? `services_${it.categoryId || 'appointment'}`
        : `${channel}_${it.vendorId || 'platform_direct'}`;

      if (!itemGroups.has(gKey)) {
        itemGroups.set(gKey, {
          channel,
          vendorId: channel === 'hvac_service' ? null : (it.vendorId || null),
          items: []
        });
      }
      itemGroups.get(gKey).items.push(it);
    }

    let quoteSubtotal = 0;
    let quoteDeliveryFee = 0;
    let quotePlatformFee = 0;
    let quoteDiscount = 0;
    let quoteTotal = 0;
    let isStoreOnline = true;
    let maxDistKm = 3.5;
    let isFreeDelivery = false;

    for (const group of itemGroups.values()) {
      let gDistKm = 3.5;
      if (group.vendorId) {
        const v = await prisma.vendor.findUnique({
          where: { id: group.vendorId },
          select: { lat: true, lng: true, isOnline: true }
        });
        if (v?.isOnline === false && group.channel === 'quick_commerce') {
          isStoreOnline = false;
        }
        if (v?.lat && v?.lng && userLat && userLng) {
          gDistKm = calculateHaversineDistanceKm(v.lat, v.lng, userLat, userLng);
        }
      }
      if (gDistKm > maxDistKm) maxDistKm = gDistKm;

      const gTotals = await calculateCartTotals({
        items: group.items,
        fulfillmentType: group.channel,
        distanceKm: gDistKm
      });

      quoteSubtotal += gTotals.subtotal;
      quoteDeliveryFee += gTotals.deliveryFee;
      quotePlatformFee += gTotals.customerPlatformFee;
      quoteDiscount += gTotals.discount;
      quoteTotal += gTotals.finalCustomerTotal;
      if (gTotals.delivery?.isFreeDelivery) isFreeDelivery = true;
    }

    res.json({
      success: true,
      quote: {
        subtotal: quoteSubtotal,
        deliveryFee: quoteDeliveryFee,
        platformFee: quotePlatformFee,
        discount: quoteDiscount,
        total: quoteTotal,
        distanceKm: maxDistKm,
        isStoreOnline,
        isFreeDelivery,
        storeCount: uniqueVendors.length || 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function resolveCustomerId(req) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (payload.role === 'customer' && payload.userId) return payload.userId;
    } catch (_err) {
      // ignore — fall through to guest
    }
  }
  return null;
}

async function getGuestCustomer() {
  const email = 'guest@shopindia.local';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hashedPassword = await bcrypt.hash('guest-not-login', 10);
    user = await prisma.user.create({
      data: {
        name: 'Guest Customer',
        email,
        password: hashedPassword,
        role: 'customer',
      },
    });
  }
  return user;
}

/** GET /api/orders — authenticated customer's orders (or ?email=<same email>) */
router.get('/', customerAuth, async (req, res) => {
  try {
    const email = req.query.email;
    if (email && email !== req.user.email) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const orders = await prisma.order.findMany({
      where: { customerId: req.user.userId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        delivery: { select: { id: true, status: true, deliveryOtp: true, distanceKm: true } },
        vendor: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            email: true,
            street: true,
            city: true,
            state: true,
            pincode: true,
            gstNumber: true,
          }
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
                vendor: {
                  select: {
                    id: true,
                    businessName: true,
                    phone: true,
                    email: true,
                    street: true,
                    city: true,
                    state: true,
                    pincode: true,
                    gstNumber: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedOrders = orders.map((o) => {
      let vert = o.type === 'quick_commerce' ? 'quick' : (o.type === 'hvac_service' || o.type === 'hvac') ? 'services' : 'shop';
      
      if (o.type === 'traditional' || !o.type) {
        const catV = (o.items?.[0]?.product?.category?.vertical || '').toLowerCase();
        if (catV === 'quick' || catV === 'quick_commerce') {
          vert = 'quick';
        } else if (catV === 'services' || catV === 'hvac_service' || catV === 'hvac') {
          vert = 'services';
        } else {
          vert = 'shop';
        }
      }

      const vendorData = o.vendor || o.items?.[0]?.product?.vendor || null;

      const itemsSubtotal = o.items.reduce((s, it) => s + (it.price * it.quantity), 0);
      const orderSubtotal = o.subtotal ?? itemsSubtotal;
      const orderDiff = Math.max(0, (o.total || 0) - orderSubtotal);
      
      let deliveryFee = o.delivery?.deliveryFee ?? 0;
      let platformFee = 0;
      if (vert === 'quick') {
        if (orderDiff > 0) {
          platformFee = 6;
          deliveryFee = Math.max(0, orderDiff - platformFee);
        }
      } else if (vert === 'services') {
        if (orderDiff > 0) {
          deliveryFee = orderDiff;
        }
      } else {
        if (orderDiff > 0) {
          deliveryFee = orderDiff;
        }
      }

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        masterOrderNumber: o.masterOrderNumber || null,
        isSubOrder: Boolean(o.isSubOrder),
        subtotal: orderSubtotal,
        discount: o.discount ?? 0,
        deliveryFee,
        platformFee,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        paymentRef: o.paymentRef,
        refundAmount: o.refundAmount || 0,
        refundReason: o.refundReason || null,
        refundedAt: o.refundedAt || null,
        type: vert === 'quick' ? 'quick_commerce' : vert === 'services' ? 'hvac_service' : 'traditional',
        vertical: vert,
        createdAt: o.createdAt,
        date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        deliveryOtp: o.delivery?.deliveryOtp || null,
        delivery: o.delivery ? {
          id: o.delivery.id,
          status: o.delivery.status,
          deliveryOtp: o.delivery.deliveryOtp,
          distanceKm: o.delivery.distanceKm,
        } : null,
        customer: o.customer ? {
          name: o.customer.name,
          email: o.customer.email,
          phone: o.customer.phone,
        } : undefined,
        vendor: vendorData ? {
          id: vendorData.id,
          businessName: vendorData.businessName,
          phone: vendorData.phone,
          email: vendorData.email,
          street: vendorData.street,
          city: vendorData.city,
          state: vendorData.state,
          pincode: vendorData.pincode,
        } : undefined,
        deliveryAddress: {
          street: [o.deliveryLine1, o.deliveryLine2].filter(Boolean).join(', ') || 'Customer Address',
          city: o.deliveryCity || 'Bengaluru',
          state: o.deliveryState || 'Karnataka',
          postalCode: o.deliveryPincode || '560102',
        },
        items: o.items.map((it) => ({
          product: {
            id: it.productId,
            title: it.name,
            price: it.price,
            image: it.product && it.product.images && it.product.images.length ? it.product.images[0].url : '',
            category: it.product?.category?.name,
          },
          title: it.name,
          price: it.price,
          quantity: it.quantity,
        })),
      };
    });

    res.json({ orders: mappedOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/orders — place a storefront order (binds to customer if token sent) */
router.post('/', async (req, res) => {
  try {
    const { items, vertical, location, paymentMethod, paymentMethodId, addressId, latitude, longitude, razorpayPayment } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }
    for (const it of items) {
      if (!it.productId || !Number.isInteger(it.quantity) || it.quantity < 1) {
        return res.status(400).json({ error: 'Invalid item in order.' });
      }
    }

    // Resolve prices and names from the database (never trust client-sent details)
    const productIds = items.map((it) => it.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: 'active' },
      select: { 
        id: true, 
        name: true, 
        basePrice: true, 
        vendorPrice: true,
        mrp: true,
        vendorId: true, 
        stock: true, 
        isOutOfStock: true,
        fulfillmentType: true,
        categoryId: true,
        category: { select: { vertical: true, name: true } }
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const resolved = [];

    for (const it of items) {
      const product = productMap.get(it.productId);
      if (!product) {
        return res.status(400).json({ error: `Unknown product ID: ${it.productId}` });
      }
      if (product.isOutOfStock || product.stock < it.quantity) {
        return res.status(400).json({ error: `Product "${product.name}" is out of stock.` });
      }

      // Resolve pricing breakdown per item via Central Pricing Engine
      const itemPricing = await calculateItemPricing({
        vendorPrice: product.vendorPrice,
        basePrice: product.basePrice,
        mrp: product.mrp,
        context: {
          productId: product.id,
          vendorId: product.vendorId,
          categoryId: product.categoryId
        }
      });

      const qty = Number(it.quantity) || 1;

      const rawVertical = (product.category?.vertical || '').toLowerCase();
      let itemChannel = product.fulfillmentType;
      if (!itemChannel || itemChannel === 'traditional') {
        if (rawVertical === 'quick' || rawVertical === 'quick_commerce') {
          itemChannel = 'quick_commerce';
        } else if (rawVertical === 'services' || rawVertical === 'hvac_service' || rawVertical === 'hvac') {
          itemChannel = 'hvac_service';
        } else {
          itemChannel = 'traditional';
        }
      }

      resolved.push({
        productId: product.id,
        vendorId: product.vendorId,
        name: product.name,
        price: product.basePrice,
        quantity: qty,
        vendorPrice: itemPricing.vendorPrice,
        platformFee: itemPricing.platformFee,
        gatewayFeeShare: itemPricing.gatewayBuffer,
        fulfillmentType: itemChannel,
        vertical: rawVertical || (itemChannel === 'hvac_service' ? 'services' : itemChannel === 'quick_commerce' ? 'quick' : 'shop'),
        categoryId: product.categoryId,
        categoryName: product.category?.name
      });
    }

    // Auto-detect vertical if not passed
    let resolvedVertical = vertical;
    if (!resolvedVertical && products.length > 0) {
      const catV = (products[0].category?.vertical || '').toLowerCase();
      if (catV === 'quick' || catV === 'quick_commerce') {
        resolvedVertical = 'quick';
      } else if (catV === 'services' || catV === 'hvac_service' || catV === 'hvac') {
        resolvedVertical = 'services';
      } else {
        resolvedVertical = 'shop';
      }
    }

    // Check Operating Hours (Midnight Blackout & Friday Prayer Break)
    try {
      const { settings: cachedSettings } = await getCachedRules();
      const opStatus = getPlatformOperatingStatus(cachedSettings);

      const hasQuickItems = resolved.some(r => r.fulfillmentType === 'quick_commerce');
      const hasServiceItems = resolved.some(r => r.fulfillmentType === 'hvac_service');

      const isBlockedVertical = (target) => {
        // Shop India (standard e-commerce, 2-5 days) is 24/7 — only Quick Commerce and Glacons Services are paused
        if (target === 'both') return hasQuickItems || hasServiceItems;
        if (target === 'quick') return hasQuickItems;
        if (target === 'services') return hasServiceItems;
        return false;
      };

      if (opStatus.fridayBreak.isActive && isBlockedVertical(opStatus.fridayBreak.verticals)) {
        return res.status(400).json({
          error: `${opStatus.fridayBreak.title}: ${opStatus.fridayBreak.subtitle}. Orders are temporarily paused.`,
          code: 'FRIDAY_PRAYER_BREAK',
          remainingSeconds: opStatus.fridayBreak.remainingSeconds,
        });
      }

      if (opStatus.midnightBlackout.isActive && isBlockedVertical(opStatus.midnightBlackout.verticals)) {
        return res.status(400).json({
          error: `${opStatus.midnightBlackout.title} Orders are temporarily closed for the night.`,
          code: 'MIDNIGHT_BLACKOUT',
          remainingSeconds: opStatus.midnightBlackout.remainingSeconds,
        });
      }

      // Check future scheduled appointment times for Glacons against operating hours
      const rawSlotNote = String(req.body?.notes || req.body?.items?.[0]?.deliveryTime || '');
      const isScheduledBooking = rawSlotNote.toLowerCase().includes('scheduled') || rawSlotNote.includes(' at ');

      if (isScheduledBooking && (fulfillmentType === 'hvac_service' || resolvedVertical === 'services' || resolvedVertical === 'hvac_service')) {
        const timeMatch = rawSlotNote.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const p = timeMatch[3].toUpperCase();
          if (p === 'PM' && h < 12) h += 12;
          if (p === 'AM' && h === 12) h = 0;
          const slotMinutes = h * 60 + m;

          // 1. Check Friday Prayer Break
          const isFridayMentioned = rawSlotNote.toLowerCase().includes('fri') || rawSlotNote.toLowerCase().includes('friday');
          if (isFridayMentioned && opStatus.fridayBreak.isEnabled && isBlockedVertical(opStatus.fridayBreak.verticals)) {
            const fStart = (opStatus.fridayBreak.start || '12:00').split(':').map(Number);
            const fEnd = (opStatus.fridayBreak.end || '14:00').split(':').map(Number);
            const fStartMin = fStart[0] * 60 + (fStart[1] || 0);
            const fEndMin = fEnd[0] * 60 + (fEnd[1] || 0);

            if (slotMinutes >= fStartMin && slotMinutes < fEndMin) {
              return res.status(400).json({
                error: `Requested appointment time falls during the Friday Prayer Break (${opStatus.fridayBreak.formattedStart} – ${opStatus.fridayBreak.formattedEnd}). Please choose an alternative arrival time.`,
                code: 'FRIDAY_PRAYER_BREAK'
              });
            }
          }

          // 2. Check Midnight Blackout
          if (opStatus.midnightBlackout.isEnabled && isBlockedVertical(opStatus.midnightBlackout.verticals)) {
            const mStart = (opStatus.midnightBlackout.start || '23:00').split(':').map(Number);
            const mEnd = (opStatus.midnightBlackout.end || '07:00').split(':').map(Number);
            const mStartMin = mStart[0] * 60 + (mStart[1] || 0);
            const mEndMin = mEnd[0] * 60 + (mEnd[1] || 0);

            let inBlackout = false;
            if (mStartMin > mEndMin) {
              inBlackout = slotMinutes >= mStartMin || slotMinutes < mEndMin;
            } else {
              inBlackout = slotMinutes >= mStartMin && slotMinutes < mEndMin;
            }

            if (inBlackout) {
              return res.status(400).json({
                error: `Requested appointment time falls during overnight closed hours (${opStatus.midnightBlackout.formattedStart} – ${opStatus.midnightBlackout.formattedEnd}). Field technicians operate during daytime hours only.`,
                code: 'MIDNIGHT_BLACKOUT'
              });
            }
          }
        }
      }
    } catch (_opErr) {
      // Non-blocking fallback
    }

    // Disallow COD for ShopIndia standard courier delivery
    const isOnlinePayment = paymentMethod === 'razorpay' || paymentMethod === 'online' || paymentMethodId === 'razorpay';
    const isCodPayment = paymentMethod === 'cod' || paymentMethod === 'COD' || paymentMethodId === 'COD';

    if (isCodPayment && (resolvedVertical === 'shop' || resolvedVertical === 'traditional' || resolved.some(r => r.fulfillmentType === 'traditional'))) {
      return res.status(400).json({ error: 'Cash on Delivery is not available for standard ShopIndia courier orders. Please pay online via Razorpay.' });
    }

    // Atomic Razorpay verification — order is recorded only if signature is valid
    if (isOnlinePayment) {
      if (!razorpayPayment || !razorpayPayment.orderId || !razorpayPayment.paymentId || !razorpayPayment.signature) {
        return res.status(400).json({ error: 'Online payment requires completed Razorpay details (orderId, paymentId, signature).' });
      }
      const isValid = verifyPaymentSignature(razorpayPayment.orderId, razorpayPayment.paymentId, razorpayPayment.signature);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid Razorpay payment signature. Payment verification failed.' });
      }
    }

    // Resolve delivery GPS coordinates
    let orderLat = latitude ? parseFloat(latitude) : null;
    let orderLng = longitude ? parseFloat(longitude) : null;
    if ((!orderLat || !orderLng) && addressId) {
      try {
        const userAddr = await prisma.address.findUnique({ where: { id: addressId } });
        if (userAddr) {
          if (!orderLat && userAddr.latitude) orderLat = userAddr.latitude;
          if (!orderLng && userAddr.longitude) orderLng = userAddr.longitude;
        }
      } catch (_addrErr) {
        // ignore
      }
    }

    const customerId = resolveCustomerId(req) || (await getGuestCustomer()).id;

    // Geographic Routing based on Pincode
    let branchId = null;
    let deliveryPincode = null;
    if (location) {
      const match = location.match(/\b\d{6}\b/);
      if (match) {
        deliveryPincode = match[0];
        
        // 1. Try checking ServiceArea mapping
        const sap = await prisma.serviceAreaPincode.findFirst({
          where: { pincode: deliveryPincode },
          include: { serviceArea: true },
        });
        
        if (sap && sap.serviceArea && sap.serviceArea.branchId) {
          branchId = sap.serviceArea.branchId;
        } else {
          // 2. Fallback: Check if it's the primary pincode of any branch
          const directBranch = await prisma.branch.findFirst({
            where: { pincode: deliveryPincode, isActive: true }
          });
          if (directBranch) {
            branchId = directBranch.id;
          }
        }
      }
    }

    const fulfillmentType = mapType(resolvedVertical);
    const isQuickOrder = fulfillmentType === 'quick_commerce';
    const isServiceOrder = fulfillmentType === 'hvac_service' || resolvedVertical === 'services';
    const itemsList = Array.isArray(items) ? items : [];
    const firstServiceItem = itemsList.find(i => i.deliveryTime || i.specs?.['Scheduled Slot']) || itemsList[0] || null;
    const scheduledSlotInfo = req.body?.notes || firstServiceItem?.deliveryTime || firstServiceItem?.specs?.['Scheduled Slot'] || null;

    // Resolve Customer's stable 4-Digit Master Delivery PIN
    let masterDeliveryPin = '1234';
    const customerRecord = customerId
      ? await prisma.user.findUnique({ where: { id: customerId }, select: { id: true, name: true, phone: true } })
      : null;

    if (customerRecord?.phone && customerRecord.phone.replace(/\D/g, '').length >= 4) {
      masterDeliveryPin = customerRecord.phone.replace(/\D/g, '').slice(-4);
    } else if (customerId) {
      let hash = 0;
      for (let i = 0; i < customerId.length; i++) {
        hash = (hash * 31 + customerId.charCodeAt(i)) % 9000;
      }
      masterDeliveryPin = String(1000 + Math.abs(hash));
    }

    // Partition items strictly by fulfillment channel FIRST, then by vendor store:
    // 1. 'hvac_service' -> Glacons services (handled by field technicians)
    // 2. 'quick_commerce' -> Quick 10-min delivery (handled by local store vendor + bike rider)
    // 3. 'traditional' -> Pan-India e-commerce (handled by warehouse/store vendor + Shiprocket courier)
    const itemGroups = new Map();
    for (const it of resolved) {
      const channel = it.fulfillmentType || 'traditional';
      const gKey = channel === 'hvac_service'
        ? `services_${it.categoryId || 'appointment'}`
        : `${channel}_${it.vendorId || 'platform_direct'}`;

      if (!itemGroups.has(gKey)) {
        itemGroups.set(gKey, {
          channel,
          vendorId: channel === 'hvac_service' ? null : (it.vendorId || null),
          items: []
        });
      }
      itemGroups.get(gKey).items.push(it);
    }

    const isMultiStore = itemGroups.size > 1;
    const masterOrderNumber = isMultiStore
      ? 'MST-' + Date.now().toString(36).toUpperCase() + Math.floor(1000 + Math.random() * 9000)
      : null;

    const createdOrders = [];
    let subOrderIdx = 1;

    for (const [groupKey, groupData] of itemGroups.entries()) {
      const { channel: groupChannel, vendorId: gVendorId, items: groupItems } = groupData;
      const groupIsServiceOrder = groupChannel === 'hvac_service';
      const groupIsQuickOrder = groupChannel === 'quick_commerce';
      const groupIsTraditionalOrder = groupChannel === 'traditional';

      let gDistKm = 3.5;
      let vendorRecord = null;

      if (gVendorId) {
        vendorRecord = await prisma.vendor.findUnique({
          where: { id: gVendorId },
          select: { id: true, businessName: true, phone: true, street: true, city: true, state: true, pincode: true, lat: true, lng: true, isOnline: true, isActive: true }
        });

        if (vendorRecord) {
          if (vendorRecord.isOnline === false && groupIsQuickOrder) {
            return res.status(400).json({
              error: `Merchant "${vendorRecord.businessName || 'Store'}" is currently offline and not accepting orders. Please try again when the store is open.`
            });
          }
          if (vendorRecord.lat && vendorRecord.lng && orderLat && orderLng) {
            gDistKm = calculateHaversineDistanceKm(vendorRecord.lat, vendorRecord.lng, orderLat, orderLng);
          }
        }
      }

      const groupTotals = await calculateCartTotals({
        items: groupItems,
        fulfillmentType: groupChannel,
        distanceKm: gDistKm,
        zoneId: branchId
      });

      const orderNumber = isMultiStore
        ? `${masterOrderNumber}-${subOrderIdx}`
        : ('OD-' + Date.now().toString(36).toUpperCase() + Math.floor(1000 + Math.random() * 9000));

      const subOrder = await prisma.order.create({
        data: {
          orderNumber,
          masterOrderNumber,
          isSubOrder: isMultiStore,
          customerId,
          vendorId: gVendorId,
          branchId,
          type: groupChannel,
          status: groupIsQuickOrder ? 'confirmed' : 'placed',
          subtotal: groupTotals.subtotal,
          discount: groupTotals.discount || 0,
          commission: groupTotals.totalAdminCommission,
          total: groupTotals.finalCustomerTotal,
          paymentMethod: isOnlinePayment ? 'razorpay' : 'COD',
          paymentStatus: isOnlinePayment ? 'paid' : 'pending',
          paymentRef: isOnlinePayment ? razorpayPayment.paymentId : null,
          deliveryLine1: location || '',
          deliveryPincode,
          deliveryLat: orderLat,
          deliveryLng: orderLng,
          notes: scheduledSlotInfo || req.body.notes || null,
          items: {
            create: groupItems.map((it) => ({
              productId: it.productId,
              vendorId: groupIsServiceOrder ? null : it.vendorId,
              name: it.name,
              price: it.price,
              quantity: it.quantity,
              vendorPrice: it.vendorPrice,
              platformFee: it.platformFee,
              gatewayFeeShare: it.gatewayFeeShare,
              vendorPaidOut: false
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true
                }
              }
            }
          }
        },
      });

      // Auto-create Delivery record and broadcast to nearby riders ONLY for Quick Shopping
      if (groupIsQuickOrder && gVendorId && vendorRecord) {
        const pickupLat = vendorRecord.lat || 17.3732;
        const pickupLng = vendorRecord.lng || 78.5385;
        const dropoffLat = orderLat || (pickupLat + 0.015);
        const dropoffLng = orderLng || (pickupLng - 0.008);
        const pickupAddress = [vendorRecord.street, vendorRecord.city, vendorRecord.state, vendorRecord.pincode].filter(Boolean).join(', ') || 'Merchant Store Address';
        const dropoffAddress = [location, deliveryPincode].filter(Boolean).join(', ') || 'Customer Delivery Address';

        await prisma.delivery.create({
          data: {
            orderId: subOrder.id,
            status: 'broadcasted',
            deliveryFee: groupTotals.totalRiderPayout || 30,
            distanceKm: gDistKm,
            deliveryOtp: masterDeliveryPin,
            pickupName: vendorRecord.businessName || 'Merchant Store',
            pickupAddress,
            pickupLat,
            pickupLng,
            pickupPhone: vendorRecord.phone || null,
            dropoffName: customerRecord?.name || 'Customer',
            dropoffAddress,
            dropoffLat,
            dropoffLng,
            dropoffPhone: customerRecord?.phone || '9999999999',
          },
        }).catch(err => console.error('Auto-broadcast delivery error:', err.message));
      }

      // Auto-create Delivery record and broadcast to nearby technicians ONLY for Glacons / HVAC Services
      if (groupIsServiceOrder) {
        const serviceTitle = subOrder.items?.[0]?.name || groupItems?.[0]?.name || 'Glacons Technician Service';
        const serviceAddress = [location, deliveryPincode].filter(Boolean).join(', ') || 'Customer Service Address';
        const serviceLat = orderLat || 17.385044;
        const serviceLng = orderLng || 78.486671;
        const technicianGuaranteedFee = groupTotals.totalRiderPayout > 0 ? groupTotals.totalRiderPayout : (groupItems?.[0]?.vendorPrice || Math.round(subOrder.total * 0.8) || 400);

        const isInstantService = req.body?.bookingMode === 'instant' || (scheduledSlotInfo && scheduledSlotInfo.toLowerCase().includes('instant'));
        const formattedPickupName = isInstantService
          ? `⚡ Instant Match: ${serviceTitle}`
          : `Glacons Service: ${serviceTitle}`;
        const formattedPickupAddress = isInstantService
          ? `⚡ INSTANT MATCH (15–30 Min ETA) | Site: ${serviceAddress}`
          : (scheduledSlotInfo ? `🗓️ Scheduled: ${scheduledSlotInfo} | Site: ${serviceAddress}` : `Site: ${serviceAddress}`);

        await prisma.delivery.create({
          data: {
            orderId: subOrder.id,
            status: 'broadcasted',
            deliveryFee: technicianGuaranteedFee,
            distanceKm: gDistKm,
            deliveryOtp: masterDeliveryPin,
            pickupName: formattedPickupName,
            pickupAddress: formattedPickupAddress,
            pickupLat: serviceLat,
            pickupLng: serviceLng,
            pickupPhone: customerRecord?.phone || null,
            dropoffName: customerRecord?.name || 'Customer',
            dropoffAddress: serviceAddress,
            dropoffLat: serviceLat,
            dropoffLng: serviceLng,
            dropoffPhone: customerRecord?.phone || '9999999999',
          },
        }).catch(err => console.error('Auto-broadcast service delivery error:', err.message));

        await prisma.serviceJob.create({
          data: {
            orderId: subOrder.id,
            status: isInstantService ? 'dispatched' : 'scheduled',
            notes: scheduledSlotInfo || (isInstantService ? '⚡ Instant Match Service' : 'Scheduled Doorstep Service'),
            originalAmount: subOrder.total,
          }
        }).catch(err => console.error('Auto-create ServiceJob error:', err.message));
      }

      // Traditional Shop India courier orders DO NOT create local Delivery or dispatch riders/technicians.
      // They are fulfilled directly by vendor/courier (Shiprocket).

      // Real-time WebSocket announcement per sub-order
      try {
        notifyNewOrder(subOrder);
      } catch (_wsErr) {
        console.warn('WebSocket notifyNewOrder error:', _wsErr.message);
      }

      createdOrders.push(subOrder);
      subOrderIdx++;
    }

    // Decrement stock for all ordered items
    await Promise.all(
      resolved.map(async (it) => {
        const prod = await prisma.product.findUnique({ where: { id: it.productId } });
        if (prod) {
          const newStock = Math.max(0, prod.stock - it.quantity);
          await prisma.product.update({
            where: { id: it.productId },
            data: {
              stock: newStock,
              isOutOfStock: newStock <= 0 ? true : prod.isOutOfStock
            }
          });
        }
      })
    );

    const masterTotal = createdOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // If online payment was verified, create PaymentRecord in captured state
    if (isOnlinePayment && razorpayPayment && createdOrders.length > 0) {
      await prisma.paymentRecord.create({
        data: {
          orderId: createdOrders[0].id,
          razorpayOrderId: razorpayPayment.orderId,
          razorpayPaymentId: razorpayPayment.paymentId,
          amount: masterTotal,
          currency: 'INR',
          status: 'captured',
        }
      }).catch(err => console.error('Failed to create PaymentRecord on order placement:', err));
    }

    // Save notification to PostgreSQL for the customer
    if (customerId && createdOrders.length > 0) {
      const isQuick = fulfillmentType === 'quick_commerce';
      const isService = fulfillmentType === 'hvac_service';
      const notifOrderRef = masterOrderNumber || createdOrders[0].orderNumber;
      await prisma.userNotification.create({
        data: {
          userId: customerId,
          category: 'order',
          title: isQuick
            ? (isMultiStore ? `Arriving in 10-25 mins! ⚡ (${createdOrders.length} Stores)` : 'Arriving in 10-15 mins! ⚡')
            : isService
            ? 'Service Booked Successfully 🛠️'
            : 'Order Placed Successfully! 🎉',
          message: isMultiStore
            ? `Your multi-store order #${notifOrderRef} has been placed. ${createdOrders.length} separate delivery riders are being assigned to pick up from each store.`
            : isQuick
            ? `Your 10-Min order #${notifOrderRef} is placed and being packed at the dark store.`
            : isService
            ? `Your service appointment #${notifOrderRef} has been booked. Technician will arrive at scheduled time.`
            : `Your E-Commerce order #${notifOrderRef} is confirmed! Estimated delivery in 2-4 business days.`,
          channel: 'IN_APP',
          isRead: false,
          link: `/orders/${createdOrders[0].id}`,
        }
      }).catch(err => console.error('Failed to create order placement notification', err));
    }

    const primaryOrder = createdOrders[0];
    res.status(201).json({
      id: primaryOrder.id,
      orderNumber: primaryOrder.orderNumber,
      masterOrderNumber: masterOrderNumber || null,
      total: masterTotal,
      status: primaryOrder.status,
      date: new Date(primaryOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      items: createdOrders.flatMap(o => o.items.map((it) => ({
        product: {
          id: it.productId,
          title: it.name,
          price: it.price,
          image: it.product && it.product.images && it.product.images.length ? it.product.images[0].url : '',
        },
        quantity: it.quantity,
      }))),
      subOrders: createdOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        vendorId: o.vendorId,
        total: o.total,
        status: o.status,
        itemCount: o.items.length
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/orders/:id/cancel — cancel order */
router.post('/:id/cancel', customerAuth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: req.user.userId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!['placed', 'pending', 'confirmed', 'processing', 'packing'].includes(order.status)) {
      return res.status(400).json({ error: 'Order can no longer be cancelled.' });
    }
    await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
    await Promise.all(order.items.map((it) =>
      prisma.product.updateMany({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } })
    ));
    res.json({ ok: true, status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/orders/:id/status — update order status (e.g. for returns/exchanges) */
router.put('/:id/status', customerAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: req.user.userId },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    await prisma.order.update({ where: { id: order.id }, data: { status } });
    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;