const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('vendor'));

/**
 * GET /api/vendor/support/tickets
 * Lists tickets associated with the logged-in vendor
 */
router.get('/tickets', async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ error: 'Vendor profile not found for user' });
    }

    const { status, priority, page = 1, limit = 25 } = req.query;
    const where = { vendorId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

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
              createdAt: true,
              items: {
                where: { vendorId },
                select: { name: true, quantity: true, price: true, vendorPrice: true }
              }
            }
          },
          messages: {
            orderBy: { sentAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.ticket.count({ where })
    ]);

    // Attach computed SLA status
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
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('[VendorSupport] Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch vendor tickets' });
  }
});

/**
 * GET /api/vendor/support/tickets/:id
 */
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: req.params.id,
        vendorId: req.user.vendorId
      },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        order: {
          include: {
            items: true,
            delivery: true
          }
        },
        messages: {
          orderBy: { sentAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or not assigned to your store' });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    console.error('[VendorSupport] Error fetching ticket:', err);
    res.status(500).json({ error: 'Failed to load ticket details' });
  }
});

/**
 * POST /api/vendor/support/tickets/:id/reply
 * Vendor replies to customer
 */
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Reply text cannot be empty' });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: 'vendor',
        text: text.trim(),
        sentAt: new Date()
      }
    });

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status === 'open' ? 'in_progress' : ticket.status
      },
      include: {
        messages: { orderBy: { sentAt: 'asc' } }
      }
    });

    res.json({ success: true, message, ticket: updatedTicket });
  } catch (err) {
    console.error('[VendorSupport] Error sending reply:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

/**
 * POST /api/vendor/support/tickets/:id/request-refund
 * Vendor forwards a refund request to Regional/Super Admin
 */
router.post('/tickets/:id/request-refund', async (req, res) => {
  try {
    const { refundAmount, reason } = req.body;
    const amount = parseFloat(refundAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid refund amount is required' });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        refundRequested: true,
        refundAmount: amount,
        refundStatus: 'requested',
        // Escalate to Tier 2 (Regional) or Tier 3 (Super Admin)
        tier: ticket.regionId ? 2 : 3,
        escalatedAt: new Date(),
        internalNotes: `${ticket.internalNotes ? ticket.internalNotes + '\n' : ''}[Vendor Refund Forwarded: ₹${amount} - Reason: ${reason || 'Customer requested'}]`
      }
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: 'system',
        text: `📌 Merchant has forwarded a refund request of ₹${amount} to platform management. Reason: ${reason || 'Approved by seller'}.`,
        sentAt: new Date()
      }
    });

    res.json({ success: true, ticket: updatedTicket, message: 'Refund request forwarded to Admin for approval' });
  } catch (err) {
    console.error('[VendorSupport] Error requesting refund:', err);
    res.status(500).json({ error: 'Failed to request refund' });
  }
});

/**
 * POST /api/vendor/support/tickets/:id/internal-note
 */
router.post('/tickets/:id/internal-note', async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note is required' });

    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        internalNotes: `${ticket.internalNotes ? ticket.internalNotes + '\n' : ''}[Merchant Note (${new Date().toLocaleTimeString()}): ${note.trim()}]`
      }
    });

    res.json({ success: true, internalNotes: updated.internalNotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
