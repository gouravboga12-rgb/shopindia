const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('regional_admin'));

/**
 * Helper to fetch regional admin profile for logged-in user
 */
async function getRegionalProfile(userId) {
  return await prisma.regionalAdminProfile.findUnique({
    where: { userId }
  });
}

/**
 * GET /api/regional-admin/support/tickets
 * Tickets in this regional manager's territory
 */
router.get('/tickets', async (req, res) => {
  try {
    const profile = await getRegionalProfile(req.user.id);
    if (!profile) {
      return res.status(403).json({ error: 'Regional admin profile not found' });
    }

    const { status, tier, priority, page = 1, limit = 25 } = req.query;
    
    // Find tickets assigned directly to this region OR matching assigned pincodes
    const where = {
      OR: [
        { regionId: profile.id },
        {
          order: {
            deliveryPincode: { in: profile.assignedPincodes || [] }
          }
        }
      ]
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (tier) where.tier = Number(tier);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          order: {
            select: {
              orderNumber: true,
              total: true,
              status: true,
              deliveryPincode: true,
              delivery: {
                select: {
                  status: true,
                  distanceKm: true,
                  riderProfile: {
                    select: {
                      user: { select: { name: true, phone: true } }
                    }
                  }
                }
              }
            }
          },
          messages: { orderBy: { sentAt: 'asc' } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.ticket.count({ where })
    ]);

    const now = new Date();
    const enriched = tickets.map(t => {
      let slaRemainingMinutes = null;
      let isBreached = false;
      if (t.slaDeadline) {
        const diffMs = new Date(t.slaDeadline).getTime() - now.getTime();
        slaRemainingMinutes = Math.round(diffMs / 60000);
        isBreached = slaRemainingMinutes <= 0 && t.status !== 'resolved' && t.status !== 'closed';
      }
      return {
        ...t,
        slaRemainingMinutes,
        isBreached
      };
    });

    res.json({
      success: true,
      tickets: enriched,
      total,
      regionName: profile.regionName,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('[RegionalSupport] Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch regional tickets' });
  }
});

/**
 * GET /api/regional-admin/support/tickets/:id
 */
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        order: {
          include: {
            items: true,
            delivery: {
              include: {
                riderProfile: {
                  include: { user: { select: { name: true, phone: true } } }
                }
              }
            }
          }
        },
        messages: { orderBy: { sentAt: 'asc' } }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (err) {
    console.error('[RegionalSupport] Error loading ticket:', err);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
});

/**
 * POST /api/regional-admin/support/tickets/:id/reply
 */
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Reply text cannot be empty' });

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: req.params.id,
        senderRole: 'regional_admin',
        text: text.trim(),
        sentAt: new Date()
      }
    });

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: 'in_progress' },
      include: { messages: { orderBy: { sentAt: 'asc' } } }
    });

    // In-App Alert Notification to Customer
    if (ticket.customerId) {
      const preview = text.trim().length > 100 ? text.trim().slice(0, 100) + '...' : text.trim();
      await prisma.userNotification.create({
        data: {
          userId: ticket.customerId,
          category: 'order',
          title: `Regional Support Replied #${ticket.ticketNumber} 💬`,
          message: `Regional Manager: "${preview}"`,
          channel: 'IN_APP',
          isRead: false,
          link: '/dashboard?tab=support'
        }
      }).catch(err => console.error('Regional admin reply userNotification error:', err));
    }

    res.json({ success: true, message, ticket });
  } catch (err) {
    console.error('[RegionalSupport] Reply error:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

/**
 * POST /api/regional-admin/support/tickets/:id/internal-note
 */
router.post('/tickets/:id/internal-note', async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note is required' });

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        internalNotes: `${ticket.internalNotes ? ticket.internalNotes + '\n' : ''}[Regional Manager Note (${new Date().toLocaleTimeString()}): ${note.trim()}]`
      }
    });

    res.json({ success: true, internalNotes: updated.internalNotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/support/tickets/:id/escalate
 * Manually escalate to Tier 3 (Super Admin)
 */
router.post('/tickets/:id/escalate', async (req, res) => {
  try {
    const { reason } = req.body;
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        tier: 3,
        escalatedAt: new Date(),
        priority: 'urgent',
        internalNotes: `${ticket?.internalNotes || ''}\n[Escalated to Super Admin: ${reason || 'Regional intervention needed'}]`
      }
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: 'system',
        text: `🚨 Ticket escalated to Super Admin Executive Queue. Reason: ${reason || 'Territory manager escalation'}.`,
        sentAt: new Date()
      }
    });

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
