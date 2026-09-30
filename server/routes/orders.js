const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const customerAuth = require('../middleware/customerAuth');

const router = express.Router();

function mapType(vertical) {
  switch (vertical) {
    case 'quick': return 'quick_commerce';
    case 'services': return 'hvac_service';
    default: return 'traditional';
  }
}

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

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        total: o.total,
        status: o.status,
        type: vert === 'quick' ? 'quick_commerce' : vert === 'services' ? 'hvac_service' : 'traditional',
        vertical: vert,
        createdAt: o.createdAt,
        date: new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
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
    const { items, vertical, location, paymentMethod } = req.body || {};

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
      resolved.push({
        productId: product.id,
        vendorId: product.vendorId,
        name: product.name,
        price: product.basePrice,
        quantity: it.quantity,
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

    const customerId = resolveCustomerId(req) || (await getGuestCustomer()).id;

    const subtotal = resolved.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const discount = 0;
    const total = subtotal - discount;
    const orderNumber = 'OD-' + Date.now().toString(36).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

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

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        vendorId: resolved.length ? resolved[0].vendorId : null,
        branchId,
        type: mapType(resolvedVertical),
        status: 'placed',
        subtotal,
        discount,
        commission: 0,
        total,
        paymentMethod: paymentMethod || 'COD',
        paymentStatus: 'pending',
        deliveryLine1: location || '',
        deliveryPincode,
        items: {
          create: resolved.map((it) => ({
            productId: it.productId,
            vendorId: it.vendorId,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
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
          channel: 'in_app',
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