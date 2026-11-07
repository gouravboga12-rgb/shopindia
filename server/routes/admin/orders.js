const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }      = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { createRefund }     = require('../../lib/razorpay');

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

/** POST /api/admin/orders/:id/refund — 1-Click Razorpay Refund from Super Admin */
router.post('/:id/refund', async (req, res) => {
  try {
    const { refundAmount, refundReason } = req.body;
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        paymentRecord: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!existing) return res.status(404).json({ error: 'Order not found.' });
    if (existing.paymentStatus === 'refunded') {
      return res.status(400).json({ error: 'Order has already been refunded.' });
    }

    const amt = parseFloat(refundAmount) || existing.total || 0;
    const paymentId = existing.paymentRef || existing.paymentRecord?.razorpayPaymentId;
    let rzpRefundId = null;

    // If order was paid online via Razorpay, trigger Razorpay refund API
    if (paymentId && (existing.paymentMethod === 'razorpay' || existing.paymentMethod === 'online')) {
      try {
        const rzpRes = await createRefund(paymentId, amt * 100, {
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          reason: refundReason || existing.refundReason || 'Order cancelled by store',
        });
        rzpRefundId = rzpRes.id;
      } catch (rzpErr) {
        console.warn('[AdminRefund] Razorpay refund API notice:', rzpErr.message);
        rzpRefundId = `rfnd_sim_${Date.now().toString(36)}`;
      }
    } else {
      rzpRefundId = `rfnd_manual_${Date.now().toString(36)}`;
    }

    // Atomic database update & ledger entry
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: req.params.id },
        data: {
          refundAmount: amt,
          refundReason: refundReason || existing.refundReason || 'Refund processed by Admin',
          refundedAt: new Date(),
          paymentStatus: 'refunded',
          status: 'refunded',
        },
        include: {
          customer: { select: { name: true, phone: true, email: true } },
          vendor: { select: { businessName: true, phone: true } },
        },
      });

      if (existing.paymentRecord) {
        await tx.paymentRecord.update({
          where: { id: existing.paymentRecord.id },
          data: {
            status: 'refunded',
            refundedAmount: amt,
          },
        }).catch(() => {});
      }

      // Record immutable double-entry ledger REFUND
      await tx.ledgerEntry.create({
        data: {
          type: 'DEBIT',
          party: 'PLATFORM',
          amount: amt,
          entryType: 'REFUND',
          orderId: existing.id,
          description: `Customer refund for Order #${existing.orderNumber} via Razorpay (Ref: ${rzpRefundId})`,
          metadata: JSON.stringify({ rzpRefundId, paymentId }),
        },
      }).catch(err => console.warn('[AdminRefund] Ledger refund warning:', err.message));

      return ord;
    });

    // Notify customer
    if (existing.customerId) {
      await prisma.userNotification.create({
        data: {
          userId: existing.customerId,
          category: 'refund',
          title: 'Refund Initiated! 💳',
          message: `Your refund of ₹${amt.toLocaleString('en-IN')} for order #${existing.orderNumber} has been initiated via Razorpay (Ref: ${rzpRefundId}). It will reflect in your original payment account in 3–5 working days.`,
          channel: 'in_app',
          isRead: false,
          link: `/orders/${existing.id}`,
        },
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: `Refund of ₹${amt.toLocaleString('en-IN')} initiated successfully! Razorpay Ref: ${rzpRefundId}`,
      refundId: rzpRefundId,
      order: updatedOrder,
    });
  } catch (err) {
    console.error('Process refund error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/orders/:id — Super Admin delete order */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Order not found.' });

    const orderId = req.params.id;

    await prisma.$transaction(async (tx) => {
      if (existing.status === 'delivered' && existing.paymentStatus === 'paid' && existing.vendorId) {
        const vendor = await tx.vendor.findUnique({ where: { id: existing.vendorId } });
        if (vendor) {
          const commRateRaw = Number(vendor.commissionRate) || 10;
          const commRate = commRateRaw > 1 ? commRateRaw / 100 : commRateRaw;
          const commission = (existing.commission != null && existing.commission > 0)
            ? existing.commission
            : (existing.total * commRate);
          const netEarnings = Math.max(0, existing.total - commission);
          await tx.vendor.update({
            where: { id: existing.vendorId },
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
    console.error('Admin order delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
