const express = require('express');
const prisma = require('../../lib/prisma');
const customerAuth = require('../../middleware/customerAuth');

const router = express.Router();

router.use(customerAuth);

const SELECT = {
  id: true, category: true, title: true, message: true, channel: true,
  isRead: true, link: true, createdAt: true,
};

/** GET /api/customer/notifications  (?category=&unread=) */
router.get('/', async (req, res) => {
  try {
    const where = { userId: req.user.userId };
    if (req.query.category && req.query.category !== 'all') where.category = req.query.category;
    if (req.query.unread === 'true') where.isRead = false;
    const notifications = await prisma.userNotification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, select: SELECT });
    const unread = await prisma.userNotification.count({ where: { userId: req.user.userId, isRead: false } });
    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PATCH /api/customer/notifications/:id/read */
router.patch('/:id/read', async (req, res) => {
  try {
    const r = await prisma.userNotification.updateMany({
      where: { id: req.params.id, userId: req.user.userId },
      data: { isRead: true },
    });
    res.json({ ok: r.count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/notifications/read-all */
router.post('/read-all', async (req, res) => {
  try {
    await prisma.userNotification.updateMany({ where: { userId: req.user.userId, isRead: false }, data: { isRead: true } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/customer/notifications/clear-all */
router.delete('/clear-all', async (req, res) => {
  try {
    await prisma.userNotification.deleteMany({ where: { userId: req.user.userId } });
    res.json({ ok: true, message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/customer/notifications/:id */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.userNotification.deleteMany({ where: { id: req.params.id, userId: req.user.userId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;