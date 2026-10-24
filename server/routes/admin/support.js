const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { postLedgerEntries } = require('../../lib/ledger');

const router = express.Router();
router.use(verifyToken, requirePermission('manage_support'));

/** GET /api/admin/support/tickets — FR-05.7 */
router.get('/tickets', async (req, res) => {
  try {
    const { status, priority, assignedTo, filter, page = 1, limit = 20 } = req.query;
    const where = {};
    const now = new Date();

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;

    // Filter tabs
    if (filter === 'refund_requests') {
      where.refundRequested = true;
    } else if (filter === 'escalated') {
      where.OR = [
        { tier: { in: [2, 3] } },
        { escalatedAt: { not: null } }
      ];
    } else if (filter === 'sla_breached') {
      where.slaDeadline = { lte: now };
      where.status = { in: ['open', 'in_progress'] };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          assignedTo: { select: { name: true, email: true } },
          order: {
            select: {
              orderNumber: true,
              total: true,
              status: true,
              delivery: {
                select: {
                  status: true,
                  riderProfile: {
                    select: {
                      id: true,
                      user: { select: { name: true, phone: true } }
                    }
                  }
                }
              }
            }
          },
          messages: { orderBy: { sentAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.ticket.count({ where }),
    ]);

    // Attach computed SLA status
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

    res.json({ tickets: enriched, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/support/tickets/:id */
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        assignedTo: { select: { name: true, email: true } },
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
        messages: { orderBy: { sentAt: 'asc' } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const now = new Date();
    let slaRemainingMinutes = null;
    let isBreached = false;
    if (ticket.slaDeadline) {
      const diffMs = new Date(ticket.slaDeadline).getTime() - now.getTime();
      slaRemainingMinutes = Math.round(diffMs / 60000);
      isBreached = slaRemainingMinutes <= 0 && ticket.status !== 'resolved' && ticket.status !== 'closed';
    }

    res.json({ ...ticket, slaRemainingMinutes, isBreached });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/admin/support/tickets/:id/status */
router.patch('/tickets/:id/status', async (req, res) => {
  try {
    const { status, assignedTo, tier, priority } = req.body;
    const data = {};
    if (status) data.status = status;
    if (assignedTo) data.assignedToId = assignedTo;
    if (tier) data.tier = Number(tier);
    if (priority) data.priority = priority;

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data,
      include: { messages: true },
    });
    res.json(ticket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/support/tickets/:id/reply */
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Reply text required' });

    await prisma.ticketMessage.create({
      data: {
        ticketId: req.params.id,
        senderRole: 'support',
        text: text.trim(),
        sentAt: new Date(),
      },
    });
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: 'in_progress' },
      include: { messages: true },
    });

    // In-App Alert Notification to Customer
    if (ticket.customerId) {
      const preview = text.trim().length > 100 ? text.trim().slice(0, 100) + '...' : text.trim();
      await prisma.userNotification.create({
        data: {
          userId: ticket.customerId,
          category: 'order',
          title: `Support Specialist Replied #${ticket.ticketNumber} 💬`,
          message: `Support Desk: "${preview}"`,
          channel: 'IN_APP',
          isRead: false,
          link: '/dashboard?tab=support'
        }
      }).catch(err => console.error('Admin reply userNotification error:', err));
    }

    res.json(ticket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/support/tickets/:id/internal-note */
router.post('/tickets/:id/internal-note', async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note is required' });

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        internalNotes: `${ticket.internalNotes ? ticket.internalNotes + '\n' : ''}[Admin Note (${new Date().toLocaleTimeString()}): ${note.trim()}]`
      }
    });

    res.json({ success: true, internalNotes: updated.internalNotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/support/tickets/:id/refund — approve/reject refund with at-fault ledger debit
 */
router.post('/tickets/:id/refund', async (req, res) => {
  try {
    const { refundStatus, refundAmount, refundAtFault = 'platform', adminNotes } = req.body;
    const amount = parseFloat(refundAmount);

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          include: {
            delivery: true
          }
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (refundStatus === 'rejected') {
      const updated = await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          refundStatus: 'rejected',
          status: 'resolved',
          internalNotes: `${ticket.internalNotes ? ticket.internalNotes + '\n' : ''}[Refund Rejected by Super Admin: ${adminNotes || 'No notes'}]`
        }
      });
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderRole: 'support',
          text: `❌ Refund request of ₹${amount || ticket.refundAmount} has been reviewed and declined. Reason: ${adminNotes || 'Does not meet refund criteria'}.`,
          sentAt: new Date()
        }
      });

      // In-App Alert Notification for Refund Rejection
      if (ticket.customerId) {
        await prisma.userNotification.create({
          data: {
            userId: ticket.customerId,
            category: 'order',
            title: `Refund Request Declined #${ticket.ticketNumber}`,
            message: `Your refund request was declined: ${adminNotes || 'Does not meet refund criteria'}.`,
            channel: 'IN_APP',
            isRead: false,
            link: '/dashboard?tab=support'
          }
        }).catch(e => console.error('Refund rejection userNotification error:', e));
      }

      return res.json({ success: true, ticket: updated });
    }

    if (refundStatus === 'approved') {
      const finalRefundAmt = amount || ticket.refundAmount || 0;

      await prisma.$transaction(async (tx) => {
        // 1. Update ticket
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            refundStatus: 'approved',
            refundAmount: finalRefundAmt,
            refundAtFault,
            status: 'resolved',
            internalNotes: `${ticket.internalNotes ? ticket.internalNotes + '\n' : ''}[Refund Approved ₹${finalRefundAmt} — At Fault: ${refundAtFault}]`
          }
        });

        // 2. Update order if attached
        if (ticket.orderId) {
          await tx.order.update({
            where: { id: ticket.orderId },
            data: {
              refundAmount: finalRefundAmt,
              refundedAt: new Date(),
              paymentStatus: 'refunded',
              status: 'refunded'
            }
          });
        }

        // 3. Post Ledger Debit to At-Fault Party
        if (refundAtFault === 'vendor' && ticket.vendorId) {
          await tx.vendor.update({
            where: { id: ticket.vendorId },
            data: { walletBalance: { decrement: finalRefundAmt } }
          });
          await postLedgerEntries([{
            party: 'VENDOR',
            partyId: ticket.vendorId,
            type: 'REFUND_DEBIT',
            amount: -finalRefundAmt,
            orderId: ticket.orderId,
            description: `Refund debit for Ticket #${ticket.ticketNumber} (Order #${ticket.order?.orderNumber || ticket.orderId})`,
            metadata: { ticketId: ticket.id, atFault: 'vendor', refundAmount: finalRefundAmt }
          }], tx);
        } else if (refundAtFault === 'rider' && ticket.order?.delivery?.riderProfileId) {
          const riderId = ticket.order.delivery.riderProfileId;
          await tx.riderProfile.update({
            where: { id: riderId },
            data: { walletBalance: { decrement: finalRefundAmt } }
          });
          await postLedgerEntries([{
            party: 'RIDER',
            partyId: riderId,
            type: 'REFUND_DEBIT',
            amount: -finalRefundAmt,
            orderId: ticket.orderId,
            description: `Delivery refund deduction for Ticket #${ticket.ticketNumber}`,
            metadata: { ticketId: ticket.id, atFault: 'rider', refundAmount: finalRefundAmt }
          }], tx);
        }

        // 4. Ticket message
        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderRole: 'support',
            text: `✅ Refund of ₹${finalRefundAmt} approved by Super Admin. Ledger entry created (At-fault party: ${refundAtFault.toUpperCase()}).`,
            sentAt: new Date()
          }
        });
      });

      // In-App Alert Notification for Refund Approval
      if (ticket.customerId) {
        await prisma.userNotification.create({
          data: {
            userId: ticket.customerId,
            category: 'order',
            title: `Refund Approved: ₹${finalRefundAmt} 🎉`,
            message: `Your refund request for Ticket #${ticket.ticketNumber} has been approved and processed.`,
            channel: 'IN_APP',
            isRead: false,
            link: '/dashboard?tab=support'
          }
        }).catch(e => console.error('Refund approval userNotification error:', e));
      }

      const refreshed = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: { messages: true }
      });

      return res.json({ success: true, ticket: refreshed, message: 'Refund approved and ledger updated successfully' });
    }

    res.status(400).json({ error: 'Invalid refund status' });
  } catch (err) {
    console.error('[AdminSupport] Refund error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
