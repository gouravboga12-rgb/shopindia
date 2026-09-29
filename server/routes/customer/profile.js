const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const customerAuth = require('../../middleware/customerAuth');

const router = express.Router();

router.use(customerAuth);

const PUBLIC_FIELDS = { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true };

/** GET /api/customer/profile */
router.get('/', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: PUBLIC_FIELDS });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const [addressCount, orderCount, reviewCount, rewardAgg, cartCount, wishlistCount, notifCount] = await Promise.all([
      prisma.address.count({ where: { userId: user.id } }),
      prisma.order.count({ where: { customerId: user.id } }),
      prisma.review.count({ where: { userId: user.id } }),
      prisma.reward.aggregate({ where: { userId: user.id }, _sum: { points: true } }),
      prisma.cartItem.count({ where: { userId: user.id, savedForLater: false } }),
      prisma.wishlistItem.count({ where: { userId: user.id } }),
      prisma.userNotification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    res.json({
      user,
      stats: {
        addresses: addressCount, orders: orderCount, reviews: reviewCount,
        rewardPoints: rewardAgg._sum?.points || 0,
        cartItems: cartCount, wishlistItems: wishlistCount, unreadNotifications: notifCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/v1/customer/profile */
router.put('/', async (req, res) => {
  try {
    const { name, phone, avatar } = req.body || {};
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name: name || undefined, phone: phone || undefined, avatar: avatar || undefined },
      select: PUBLIC_FIELDS,
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/profile/change-password { currentPassword, newPassword } */
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'currentPassword required; newPassword must be 6+ chars.' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.userId }, data: { password: hashed } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/customer/profile { password } */
router.delete('/', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (req.body?.password) {
      const ok = await bcrypt.compare(req.body.password, user.password);
      if (!ok) return res.status(401).json({ error: 'Password incorrect.' });
    }
    await prisma.user.update({ where: { id: req.user.userId }, data: { status: 'blocked' } });
    res.json({ ok: true, message: 'Account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;