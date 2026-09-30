const express = require('express');
const prisma = require('../../lib/prisma');
const customerAuth = require('../../middleware/customerAuth');

const router = express.Router();

router.use(customerAuth);

async function findOwnOrder(userId, orderNumber) {
  return prisma.order.findFirst({
    where: { customerId: userId, orderNumber },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      vendor: { select: { id: true, businessName: true, phone: true, email: true, street: true, city: true, state: true, pincode: true } },
      items: {
        include: {
          product: {
            include: {
              images: true,
              vendor: { select: { id: true, businessName: true, phone: true, email: true, street: true, city: true, state: true, pincode: true } }
            }
          }
        }
      }
    },
  });
}

/** GET /api/customer/orders/:orderNumber — order detail incl. tracking history */
router.get('/:orderNumber', async (req, res) => {
  try {
    const order = await findOwnOrder(req.user.userId, req.params.orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/orders/:orderNumber/cancel */
router.post('/:orderNumber/cancel', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { customerId: req.user.userId, orderNumber: req.params.orderNumber },
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

/** POST /api/customer/orders/:orderNumber/return */
router.post('/:orderNumber/return', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { customerId: req.user.userId, orderNumber: req.params.orderNumber },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Only delivered orders can be returned.' });
    await prisma.order.update({ where: { id: order.id }, data: { status: 'return_requested', refundReason: req.body?.reason || null } });
    res.json({ ok: true, status: 'return_requested' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/orders/:orderNumber/exchange */
router.post('/:orderNumber/exchange', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { customerId: req.user.userId, orderNumber: req.params.orderNumber },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Only delivered orders can be exchanged.' });
    await prisma.order.update({ where: { id: order.id }, data: { status: 'exchange_requested', notes: req.body?.reason || order.notes } });
    res.json({ ok: true, status: 'exchange_requested' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/orders/:orderNumber/reorder — duplicates into a fresh cart */
router.post('/:orderNumber/reorder', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { customerId: req.user.userId, orderNumber: req.params.orderNumber },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    let cart = await prisma.cart.findUnique({ where: { userId: req.user.userId } });
    if (!cart) cart = await prisma.cart.create({ data: { userId: req.user.userId } });
    for (const it of order.items) {
      if (!it.productId) continue;
      await prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: it.productId } },
        update: { quantity: { increment: it.quantity }, savedForLater: false },
        create: { cartId: cart.id, userId: req.user.userId, productId: it.productId, quantity: it.quantity },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;