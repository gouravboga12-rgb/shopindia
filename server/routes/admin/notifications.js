const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken);
router.use(requireRole('super_admin'));

// Send Targeted Multi-Panel Notification Broadcast
router.post('/broadcast', async (req, res) => {
  try {
    const { targets, title, message, priority = 'info', category = 'alert', link } = req.body;

    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: 'Please select at least one recipient target (Customers, Vendors, or Regional Admins).' });
    }
    if (!title || !message) {
      return res.status(400).json({ error: 'Notification title and message are required.' });
    }

    const mappedRoles = [];
    if (targets.includes('customers') || targets.includes('customer') || targets.includes('users')) {
      mappedRoles.push('customer');
    }
    if (targets.includes('vendors') || targets.includes('vendor')) {
      mappedRoles.push('vendor');
    }
    if (targets.includes('regional_admins') || targets.includes('regional_admin')) {
      mappedRoles.push('regional_admin');
    }

    if (mappedRoles.length === 0) {
      return res.status(400).json({ error: 'No valid recipient roles selected.' });
    }

    // Query active recipients
    const users = await prisma.user.findMany({
      where: {
        role: { in: mappedRoles },
        status: { not: 'banned' }
      },
      select: { id: true, role: true }
    });

    if (users.length > 0) {
      const records = users.map(u => ({
        userId: u.id,
        title: title.trim(),
        message: message.trim(),
        category: category || 'alert',
        channel: 'IN_APP',
        isRead: false,
        link: link?.trim() || null
      }));

      // Insert in chunks of 500 to avoid payload limit
      const chunkSize = 500;
      for (let i = 0; i < records.length; i += chunkSize) {
        await prisma.userNotification.createMany({
          data: records.slice(i, i + chunkSize)
        });
      }
    }

    // Audit log in notification logs
    const targetLabel = targets.map(t => {
      if (t.includes('cust') || t.includes('user')) return 'Customers';
      if (t.includes('vend')) return 'Vendors';
      if (t.includes('region')) return 'Regional Admins';
      return t;
    }).join(' + ');

    await prisma.notificationLog.create({
      data: {
        recipient: targetLabel,
        type: 'IN_APP',
        event: 'BROADCAST_ALERT',
        status: 'sent',
        message: `[${priority.toUpperCase()}] ${title}: ${message}`
      }
    });

    res.json({
      success: true,
      deliveredCount: users.length,
      targetLabel,
      message: `Alert successfully dispatched to ${users.length} recipients across ${targetLabel}.`
    });
  } catch (error) {
    console.error('[NOTIFICATIONS BROADCAST ERROR]:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch notification broadcast' });
  }
});

// Get broadcast history
router.get('/broadcasts', async (_req, res) => {
  try {
    const broadcasts = await prisma.notificationLog.findMany({
      where: { event: 'BROADCAST_ALERT' },
      orderBy: { sentAt: 'desc' },
      take: 50
    });
    res.json({ broadcasts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch broadcast history' });
  }
});

// Get templates
router.get('/templates', async (_req, res) => {
  try {
    const templates = await prisma.notificationTemplate.findMany();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Update/Create template
router.put('/templates', async (req, res) => {
  try {
    const { event, smsBody, emailSubject, emailBody, isActive } = req.body;
    
    const template = await prisma.notificationTemplate.upsert({
      where: { event },
      update: { smsBody, emailSubject, emailBody, isActive },
      create: { event, smsBody, emailSubject, emailBody, isActive }
    });

    res.json({ template, message: 'Template saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// Get recent logs
router.get('/logs', async (_req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 200
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
