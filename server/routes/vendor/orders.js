const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { recordVendorCredit } = require('../../lib/ledger');

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
      // Fetch vendor to get commission rate
      const vendor = await prisma.vendor.findUnique({ where: { id: req.user.vendorId } });
      const commRateRaw = Number(vendor?.commissionRate) || 10;
      const commRate = commRateRaw > 1 ? commRateRaw / 100 : commRateRaw;
      const commission = parseFloat(((existing.total || 0) * commRate).toFixed(2));
      const netEarnings = parseFloat(((existing.total || 0) - commission).toFixed(2));

      await prisma.$transaction(async (tx) => {
        order = await tx.order.update({
          where: { id: req.params.id },
          data: {
            status: 'delivered',
            paymentStatus: 'paid',
            commission,
          },
          include: { items: true },
        });

        await tx.vendor.update({
          where: { id: req.user.vendorId },
          data: {
            walletBalance: { increment: netEarnings },
          },
        });

        // Mark all items as paid out
        await tx.orderItem.updateMany({
          where: { orderId: req.params.id },
          data: { vendorPaidOut: true },
        });

        // Write immutable ledger entries (VENDOR_CREDIT + PLATFORM_FEE)
        await recordVendorCredit(tx, {
          orderId: req.params.id,
          vendorId: req.user.vendorId,
          vendorAmount: netEarnings,
          commission,
          orderTotal: existing.total || 0,
        });
      });
    } else {
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

    const orderId = req.params.id;

    await prisma.$transaction(async (tx) => {
      // Revert vendor wallet balance if order was delivered & credited, ensuring non-negative balance
      if (existing.status === 'delivered' && existing.paymentStatus === 'paid' && existing.total) {
        const vendor = await tx.vendor.findUnique({ where: { id: req.user.vendorId } });
        if (vendor) {
          const commRateRaw = Number(vendor.commissionRate) || 10;
          const commRate = commRateRaw > 1 ? commRateRaw / 100 : commRateRaw;
          const commission = (existing.commission != null && existing.commission > 0)
            ? existing.commission
            : (existing.total * commRate);
          const netEarnings = Math.max(0, existing.total - commission);
          await tx.vendor.update({
            where: { id: req.user.vendorId },
            data: { walletBalance: Math.max(0, (vendor.walletBalance || 0) - netEarnings) },
          });
        }
      }

      // 1. Detach non-cascading foreign keys
      await tx.ticket.updateMany({ where: { orderId }, data: { orderId: null } });
      await tx.ledgerEntry.updateMany({ where: { orderId }, data: { orderId: null } });
      await tx.transaction.updateMany({ where: { orderId }, data: { orderId: null } });

      // 2. Detach review references from order items
      const orderItems = await tx.orderItem.findMany({ where: { orderId }, select: { id: true } });
      const orderItemIds = orderItems.map(i => i.id);
      if (orderItemIds.length > 0) {
        await tx.review.updateMany({ where: { orderItemId: { in: orderItemIds } }, data: { orderItemId: null } });
      }

      // 3. Delete dependent records
      await tx.shiprocketShipment.deleteMany({ where: { orderId } });
      await tx.delivery.deleteMany({ where: { orderId } });
      await tx.paymentRecord.deleteMany({ where: { orderId } });
      await tx.serviceJob.deleteMany({ where: { orderId } });

      // 4. Delete items and finally the order
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
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
    const pickupLat = order.vendor.lat || 17.3732;
    const pickupLng = order.vendor.lng || 78.5385;

    // Build clean dropoff address without empty comma patterns
    const rawParts = [
      order.deliveryLine1,
      order.deliveryLine2,
      order.deliveryCity,
      order.deliveryState,
      order.deliveryPincode
    ];
    const validParts = rawParts.filter(p => typeof p === 'string' && p.trim() && p.trim() !== ',');
    let dropoffAddress = validParts.length > 0 ? validParts.join(', ') : '';

    if (!dropoffAddress && shipping) {
      if (typeof shipping === 'string' && shipping.trim() && shipping.trim() !== ',') {
        dropoffAddress = shipping.trim();
      } else if (typeof shipping === 'object') {
        const shipParts = [shipping.street, shipping.city, shipping.state, shipping.pincode]
          .filter(p => typeof p === 'string' && p.trim() && p.trim() !== ',');
        dropoffAddress = shipParts.join(', ');
      }
    }
    if (!dropoffAddress || dropoffAddress.replace(/[,\s]/g, '').length === 0) {
      dropoffAddress = 'Customer Doorstep, Dilsukhnagar, Hyderabad';
    }

    // Dropoff coordinates: use exact customer GPS pin from order if present, else fallback
    const dropoffLat = order.deliveryLat || (pickupLat + 0.015);
    const dropoffLng = order.deliveryLng || (pickupLng - 0.008);

    const pickupAddress = [order.vendor.street, order.vendor.city, order.vendor.state, order.vendor.pincode]
      .filter(p => typeof p === 'string' && p.trim() && p.trim() !== ',')
      .join(', ') || 'Vendor Store, Hyderabad';

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
        pickupLat,
        pickupLng,
        dropoffName: (shipping && shipping.name) || order.customer?.name || 'Customer',
        dropoffAddress,
        dropoffPhone: (shipping && shipping.phone) || order.customer?.phone,
        dropoffLat,
        dropoffLng,
      },
      update: {
        status: 'broadcasted',
        riderProfileId: null,
        deliveryOtp: otp,
        assignedAt: null,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        pickupAddress,
        dropoffAddress,
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

