const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('rider'));

/**
 * GET /api/rider/notifications
 * Get latest notifications and unread count for the authenticated rider
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [notifications, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.userNotification.count({
        where: { userId, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('[RIDER NOTIFICATIONS GET ERROR]:', error);
    res.status(500).json({ error: 'Failed to fetch rider notifications' });
  }
});

/**
 * PUT /api/rider/notifications/:id/read
 * Mark a single notification as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await prisma.userNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[RIDER NOTIFICATIONS READ ERROR]:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PUT /api/rider/notifications/read-all
 * Mark all notifications as read for this rider
 */
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.user.userId;

    await prisma.userNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('[RIDER NOTIFICATIONS READ ALL ERROR]:', error);
    res.status(500).json({ error: 'Failed to update all notifications' });
  }
});

module.exports = router;

