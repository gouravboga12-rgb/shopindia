const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('vendor'));

const VENDOR_STATUSES = ['placed', 'confirmed', 'packing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'];

/** GET /api/vendor/orders — FR-02.3: Vendor's orders */
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = { vendorId: req.user.vendorId };
    if (status) where.status = status;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          vendor: { select: { id: true, businessName: true, phone: true, email: true, street: true, city: true, state: true, pincode: true, gstNumber: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  basePrice: true,
                  mrp: true,
                  stock: true,
                  category: { select: { name: true } },
                  images: { select: { url: true }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/vendor/orders/:id */
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/vendor/orders/:id/status — FR-02.3: Process/pack/update */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!VENDOR_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${VENDOR_STATUSES.join(', ')}` });
    }
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    let order;
    if (status === 'delivered' && existing.status !== 'delivered') {
      const vendor = await prisma.vendor.findUnique({ where: { id: req.user.vendorId } });
      const commRateRaw = Number(vendor?.commissionRate) || 10;
      const commRate = commRateRaw > 1 ? commRateRaw / 100 : commRateRaw;
      const commission = existing.total * commRate;
      const netEarnings = existing.total - commission;

      const [updatedOrder] = await prisma.$transaction([
        prisma.order.update({
          where: { id: req.params.id },
          data: {
            status: 'delivered',
            paymentStatus: 'paid',
            commission,
          },
          include: { items: true },
        }),
        prisma.vendor.update({
          where: { id: req.user.vendorId },
          data: {
            walletBalance: { increment: netEarnings }
          }
        })
      ]);
      order = await prisma.order.update({
        where: { id: req.params.id },
        data: { status },
        include: { items: true },
      });
    }

    if (existing.customerId) {
      let title = `Order Update: ${status.toUpperCase()}`;
      let message = `Your order #${existing.orderNumber} status has been updated to ${status}.`;

      if (status === 'confirmed') {
        title = existing.type === 'traditional' ? 'Order Confirmed by Seller 🏪' : 'Order Confirmed! 🎉';
        message = existing.type === 'traditional' 
          ? `Your order #${existing.orderNumber} has been verified and seller is preparing your package.`
          : `Your order #${existing.orderNumber} is confirmed by the merchant.`;
      } else if (status === 'packing' || status === 'ready_to_ship') {
        title = existing.type === 'quick_commerce' ? 'Packing your 10-Min Order 🛍️' : existing.type === 'traditional' ? 'Package Boxed & Ready 📦' : 'Items Packed & Ready 📦';
        message = existing.type === 'traditional'
          ? `Your order #${existing.orderNumber} is packed and ready for courier pickup.`
          : `Your order #${existing.orderNumber} is packed and ready for delivery.`;
      } else if (status === 'shipped') {
        title = existing.type === 'quick_commerce' ? 'Rider On The Way! ⚡🛵' : 'Package Shipped & In Transit 🚚';
        message = existing.type === 'traditional'
          ? `Your order #${existing.orderNumber} has been dispatched via courier service.`
          : `Your order #${existing.orderNumber} has been dispatched and is on the way!`;
      } else if (status === 'delivered') {
        title = existing.type === 'traditional' ? 'Package Delivered! 🎁' : 'Order Delivered! 🥳';
        message = existing.type === 'traditional'
          ? `Package #${existing.orderNumber} was delivered to your address. Enjoy your purchase!`
          : `Order #${existing.orderNumber} was delivered. Enjoy your items!`;
      }

      await prisma.userNotification.create({
        data: {
          userId: existing.customerId,
          category: 'order',
          title,
          message,
          channel: 'in_app',
          isRead: false,
          link: `/orders/${existing.id}`,
        }
      }).catch(err => console.error('Failed to notify customer from vendor update', err));
    }

    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** DELETE /api/vendor/orders/:id — Delete order permanently from entire platform */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    await prisma.$transaction(async (tx) => {
      // Revert vendor wallet balance if order was delivered & credited
      if (existing.status === 'delivered' && existing.paymentStatus === 'paid' && existing.total) {
        const vendor = await tx.vendor.findUnique({ where: { id: req.user.vendorId } });
        const commRateRaw = Number(vendor?.commissionRate) || 10;
        const commRate = commRateRaw > 1 ? commRateRaw / 100 : commRateRaw;
        const commission = existing.total * commRate;
        const netEarnings = existing.total - commission;
        await tx.vendor.update({
          where: { id: req.user.vendorId },
          data: { walletBalance: { decrement: netEarnings } },
        });
      }

      await tx.ticket.updateMany({ where: { orderId: req.params.id }, data: { orderId: null } });
      await tx.serviceJob.deleteMany({ where: { orderId: req.params.id } }).catch(() => {});
      await tx.transaction.deleteMany({ where: { orderId: req.params.id } }).catch(() => {});
      await tx.orderItem.deleteMany({ where: { orderId: req.params.id } });
      await tx.order.delete({ where: { id: req.params.id } });
    });

    res.json({ success: true, message: 'Order deleted successfully.' });
  } catch (err) {
    console.error('Vendor order delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/vendor/orders/:id/broadcast — Broadcast order to nearby riders */
router.post('/:id/broadcast', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
      include: {
        vendor: true,
        items: true,
        delivery: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Generate random 4-digit OTP for completion
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const shipping = order.shippingAddress || {};
    const dropoffAddress = typeof shipping === 'string' 
      ? shipping 
      : `${shipping.street || ''}, ${shipping.city || ''}, ${shipping.state || ''} ${shipping.pincode || ''}`.trim() || 'Customer Doorstep';

    const pickupAddress = `${order.vendor.street || ''}, ${order.vendor.city || ''}, ${order.vendor.state || ''} ${order.vendor.pincode || ''}`.trim() || 'Vendor Store';

    // Calculate delivery fee (base ₹50 + ₹10/km or fixed ₹60)
    const deliveryFee = 60;

    const delivery = await prisma.delivery.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        status: 'broadcasted',
        deliveryFee,
        distanceKm: 4.2,
        deliveryOtp: otp,
        pickupName: order.vendor.businessName || 'Merchant Store',
        pickupAddress,
        pickupPhone: order.vendor.phone,
        dropoffName: shipping.name || 'Customer',
        dropoffAddress,
        dropoffPhone: shipping.phone,
      },
      update: {
        status: 'broadcasted',
        riderProfileId: null,
        deliveryOtp: otp,
        assignedAt: null,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'packing' },
    });

    res.json({
      success: true,
      message: 'Order broadcasted to active nearby riders!',
      delivery,
    });
  } catch (err) {
    console.error('Broadcast order error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

