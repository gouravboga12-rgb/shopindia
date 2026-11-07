const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const customerAuth = require('../middleware/customerAuth');
const { calculateItemPricing, calculateDeliveryPricing, calculateCartTotals, getCachedRules } = require('../lib/pricing');
const { verifyPaymentSignature } = require('../lib/razorpay');

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

/** GET /api/orders/pricing-config — Public dynamic checkout settings */
router.get('/pricing-config', async (req, res) => {
  try {
    const { settings } = await getCachedRules();
    res.json({
      success: true,
      settings: {
        shiprocket_base_fee: parseFloat(settings['shiprocket_base_fee'] || 49),
        shiprocket_free_threshold: parseFloat(settings['shiprocket_free_threshold'] || 499),
        quick_customer_base_fee: parseFloat(settings['quick_customer_base_fee'] || 35),
        quick_customer_per_km: parseFloat(settings['quick_customer_per_km'] || 7),
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
      select: { id: true, basePrice: true, vendorId: true, categoryId: true }
    });
    const pMap = new Map(products.map(p => [p.id, p]));

    const resolved = items.map(it => {
      const p = pMap.get(it.productId);
      return {
        productId: it.productId,
        vendorId: p?.vendorId || it.vendorId,
        categoryId: p?.categoryId || it.categoryId,
        price: p?.basePrice || it.price || 0,
        quantity: it.quantity || 1
      };
    });

    let distanceKm = 3.5;
    if (resolved.length && resolved[0].vendorId && userLat && userLng) {
      const v = await prisma.vendor.findUnique({
        where: { id: resolved[0].vendorId },
        select: { lat: true, lng: true }
      });
      if (v?.lat && v?.lng) {
        distanceKm = calculateHaversineDistanceKm(v.lat, v.lng, userLat, userLng);
      }
    }

    const totals = await calculateCartTotals({
      items: resolved,
      fulfillmentType: mapType(vertical),
      distanceKm
    });

    res.json({
      success: true,
      quote: {
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        platformFee: totals.customerPlatformFee,
        discount: totals.discount,
        total: totals.finalCustomerTotal,
        distanceKm,
        isFreeDelivery: totals.delivery?.isFreeDelivery || false
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
        vendorId: true, 
        stock: true, 
        isOutOfStock: true,
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

      resolved.push({
        productId: product.id,
        vendorId: product.vendorId,
        name: product.name,
        price: product.basePrice,
        quantity: qty,
        vendorPrice: itemPricing.vendorPrice,
        platformFee: itemPricing.platformFee,
        gatewayFeeShare: itemPricing.gatewayBuffer
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

    // Disallow COD for ShopIndia standard courier delivery
    const isOnlinePayment = paymentMethod === 'razorpay' || paymentMethod === 'online' || paymentMethodId === 'razorpay';
    const isCodPayment = paymentMethod === 'cod' || paymentMethod === 'COD' || paymentMethodId === 'COD';

    if (isCodPayment && (resolvedVertical === 'shop' || resolvedVertical === 'traditional')) {
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

    // Resolve distanceKm for Quick Commerce using actual vendor store & customer GPS
    let orderDistKm = 3.5;
    if (resolved.length && resolved[0].vendorId && orderLat && orderLng) {
      const vRec = await prisma.vendor.findUnique({
        where: { id: resolved[0].vendorId },
        select: { lat: true, lng: true }
      });
      if (vRec?.lat && vRec?.lng) {
        orderDistKm = calculateHaversineDistanceKm(vRec.lat, vRec.lng, orderLat, orderLng);
      }
    }

    const fulfillmentType = mapType(resolvedVertical);
    const cartTotals = await calculateCartTotals({
      items: resolved,
      fulfillmentType,
      distanceKm: orderDistKm,
      zoneId: branchId
    });

    const subtotal = cartTotals.subtotal;
    const discount = cartTotals.discount || 0;
    const deliveryFee = cartTotals.deliveryFee;
    const totalCommission = cartTotals.totalAdminCommission;
    const total = cartTotals.finalCustomerTotal;
    const riderFee = cartTotals.totalRiderPayout;
    const orderNumber = 'OD-' + Date.now().toString(36).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

    const isQuickOrder = fulfillmentType === 'quick_commerce';

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        vendorId: resolved.length ? resolved[0].vendorId : null,
        branchId,
        type: fulfillmentType,
        status: isQuickOrder ? 'confirmed' : 'placed',
        subtotal,
        discount,
        commission: totalCommission,
        total,
        paymentMethod: isOnlinePayment ? 'razorpay' : 'COD',
        paymentStatus: isOnlinePayment ? 'paid' : 'pending',
        paymentRef: isOnlinePayment ? razorpayPayment.paymentId : null,
        deliveryLine1: location || '',
        deliveryPincode,
        deliveryLat: orderLat,
        deliveryLng: orderLng,
        items: {
          create: resolved.map((it) => ({
            productId: it.productId,
            vendorId: it.vendorId,
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

    // If online payment was verified, create PaymentRecord in captured state
    if (isOnlinePayment && razorpayPayment) {
      await prisma.paymentRecord.create({
        data: {
          orderId: order.id,
          razorpayOrderId: razorpayPayment.orderId,
          razorpayPaymentId: razorpayPayment.paymentId,
          amount: order.total,
          currency: 'INR',
          status: 'captured',
        }
      }).catch(err => console.error('Failed to create PaymentRecord on order placement:', err));
    }

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

    // Auto-create Delivery record and broadcast to nearby riders immediately for Quick Shopping
    if (order.type === 'quick_commerce' && order.vendorId) {
      const vendorRecord = await prisma.vendor.findUnique({
        where: { id: order.vendorId },
        select: { id: true, businessName: true, phone: true, street: true, city: true, state: true, pincode: true, lat: true, lng: true },
      });

      if (vendorRecord) {
        const pickupLat = vendorRecord.lat || 17.3732;
        const pickupLng = vendorRecord.lng || 78.5385;
        const dropoffLat = order.deliveryLat || (pickupLat + 0.015);
        const dropoffLng = order.deliveryLng || (pickupLng - 0.008);
        const pickupAddress = [vendorRecord.street, vendorRecord.city, vendorRecord.state, vendorRecord.pincode].filter(Boolean).join(', ') || 'Merchant Store Address';
        const dropoffAddress = [order.deliveryLine1, order.deliveryCity, order.deliveryState, order.deliveryPincode].filter(Boolean).join(', ') || 'Customer Delivery Address';

        // Distance via Haversine
        const dLat = ((dropoffLat - pickupLat) * Math.PI) / 180;
        const dLng = ((dropoffLng - pickupLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((pickupLat * Math.PI) / 180) *
            Math.cos((dropoffLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const calculatedDist = Math.max(1, Math.round(6371 * c * 10) / 10);

        await prisma.delivery.create({
          data: {
            orderId: order.id,
            status: 'broadcasted',
            deliveryFee: riderFee || 30,
            distanceKm: orderDistKm || calculatedDist,
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
    }

    // Save notification to PostgreSQL for the customer
    if (customerId) {
      const isQuick = order.type === 'quick_commerce';
      const isService = order.type === 'hvac_service';
      await prisma.userNotification.create({
        data: {
          userId: customerId,
          category: 'order',
          title: isQuick ? 'Arriving in 10-15 mins! ⚡' : isService ? 'Service Booked Successfully 🛠️' : 'Order Placed Successfully! 🎉',
          message: isQuick 
            ? `Your 10-Min order #${order.orderNumber} is placed and being packed at the dark store.`
            : isService 
            ? `Your service appointment #${order.orderNumber} has been booked. Technician will arrive at scheduled time.`
            : `Your E-Commerce order #${order.orderNumber} is confirmed! Estimated delivery in 2-4 business days.`,
          channel: 'IN_APP',
          isRead: false,
          link: `/orders/${order.id}`,
        }
      }).catch(err => console.error('Failed to create order placement notification', err));
    }

    res.status(201).json({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      date: new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      items: order.items.map((it) => ({
        product: {
          id: it.productId,
          title: it.name,
          price: it.price,
          image: it.product && it.product.images && it.product.images.length ? it.product.images[0].url : '',
        },
        quantity: it.quantity,
      })),
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