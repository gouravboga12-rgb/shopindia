const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }      = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requirePermission('manage_orders'));

/** GET /api/admin/orders — FR-05.3: Monitor all orders */
router.get('/', async (req, res) => {
  try {
    const { status, type, vendorId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)   where.status   = status;
    if (type)     where.type     = type;
    if (vendorId) where.vendorId = vendorId;

    // Data isolation for Branch Managers
    if (req.user.role === 'branch_manager' && req.user.branchId) {
      where.branchId = req.user.branchId;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          vendor: { select: { id: true, businessName: true, phone: true, email: true, street: true, city: true, state: true, pincode: true } },
          branch: { select: { name: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  vendor: { select: { id: true, businessName: true, phone: true, email: true, street: true, city: true, state: true, pincode: true } }
                }
              }
            }
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

/** GET /api/admin/orders/:id */
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        vendor: { select: { id: true, businessName: true, phone: true, email: true, street: true, city: true, state: true, pincode: true } },
        items: { include: { product: true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/admin/orders/:id/status */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });

    if (order.customerId) {
      let title = `Order Update: ${status.toUpperCase()}`;
      let message = `Your order #${order.orderNumber} status has been updated to ${status}.`;

      if (status === 'confirmed') {
        title = order.type === 'traditional' ? 'Order Confirmed by Seller 🏪' : 'Order Confirmed! 🎉';
        message = order.type === 'traditional' 
          ? `Your order #${order.orderNumber} has been verified and seller is preparing the package.`
          : `Your order #${order.orderNumber} is confirmed and sent to preparation.`;
      } else if (status === 'processing' || status === 'preparing' || status === 'packing' || status === 'ready_to_ship') {
        title = order.type === 'quick_commerce' ? 'Packing your 10-Min Order 🛍️' : order.type === 'traditional' ? 'Package Boxed & Ready 📦' : 'Items Packed & Ready 📦';
        message = order.type === 'traditional'
          ? `Your order #${order.orderNumber} is packed and awaiting courier pickup.`
          : `Your order #${order.orderNumber} is packed and prepared for dispatch.`;
      } else if (status === 'out_for_delivery' || status === 'on_the_way' || status === 'shipped' || status === 'dispatched') {
        title = order.type === 'quick_commerce' 
          ? 'Rider On The Way! ⚡🛵' 
          : order.type === 'hvac_service' 
          ? 'Technician On The Way 🛠️' 
          : 'Package Shipped & In Transit 🚚';
        message = order.type === 'quick_commerce'
          ? `Your rider is on the way with order #${order.orderNumber}.`
          : order.type === 'hvac_service'
          ? `Your certified technician is heading to your address for order #${order.orderNumber}.`
          : `Your package #${order.orderNumber} has been dispatched with express courier and is on its way.`;
      } else if (status === 'delivered' || status === 'completed') {
        title = order.type === 'hvac_service' ? 'Service Completed! ✅' : order.type === 'traditional' ? 'Package Delivered! 🎁' : 'Order Delivered! 🥳';
        message = order.type === 'traditional'
          ? `Package #${order.orderNumber} was successfully delivered to your doorstep. Enjoy your purchase!`
          : `Order #${order.orderNumber} has been successfully delivered. Thank you for choosing ShopIndia!`;
      }

      await prisma.userNotification.create({
        data: {
          userId: order.customerId,
          category: 'order',
          title,
          message,
          channel: 'in_app',
          isRead: false,
          link: `/orders/${order.id}`,
        }
      }).catch(err => console.error('Failed to notify customer', err));
    }

    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/orders/:id/refund — FR-05.3: Process refunds */
router.post('/:id/refund', async (req, res) => {
  try {
    const { refundAmount, refundReason } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        refundAmount,
        refundReason,
        refundedAt:    new Date(),
        paymentStatus: 'refunded',
        status:        'refunded',
      },
    });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** DELETE /api/admin/orders/:id — Super Admin delete order */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    await prisma.$transaction(async (tx) => {
      if (existing.status === 'delivered' && existing.paymentStatus === 'paid' && existing.vendorId) {
        const vendor = await tx.vendor.findUnique({ where: { id: existing.vendorId } });
        const commRateRaw = Number(vendor?.commissionRate) || 10;
        const commRate = commRateRaw > 1 ? commRateRaw / 100 : commRateRaw;
        const commission = existing.total * commRate;
        const netEarnings = existing.total - commission;
        await tx.vendor.update({
          where: { id: existing.vendorId },
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
    console.error('Admin order delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
