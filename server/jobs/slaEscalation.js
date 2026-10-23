/**
 * SLA Escalation Background Job
 * 
 * Runs every 5 minutes to scan for tickets that have breached their SLA response deadline.
 * Escalates tickets according to the 3-Tier hierarchy:
 *   Tier 1 (Vendor) -> Tier 2 (Regional Admin) -> Tier 3 (Super Admin)
 */

const prisma = require('../lib/prisma');

async function checkAndEscalateTickets() {
  try {
    const now = new Date();

    // Find open/in_progress tickets that have passed their SLA deadline and are below Tier 3
    const overdueTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
        slaDeadline: { lte: now },
        tier: { in: [1, 2] }
      },
      include: {
        order: { select: { orderNumber: true } }
      }
    });

    if (overdueTickets.length === 0) return { escalatedCount: 0 };

    let escalatedCount = 0;

    for (const ticket of overdueTickets) {
      let nextTier = 3;
      let reasonText = '';

      if (ticket.tier === 1) {
        if (ticket.regionId) {
          nextTier = 2;
          reasonText = `⚠️ SLA Breached: Initial response deadline passed. Auto-escalated to Tier 2 (Regional Operations Management).`;
        } else {
          nextTier = 3;
          reasonText = `🚨 SLA Breached: Response deadline passed. Auto-escalated directly to Tier 3 (Super Admin Executive Queue).`;
        }
      } else if (ticket.tier === 2) {
        nextTier = 3;
        reasonText = `🚨 SLA Breached: Regional response deadline passed. Auto-escalated to Tier 3 (Super Admin Executive Queue).`;
      }

      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            tier: nextTier,
            escalatedAt: now,
            priority: ticket.priority === 'low' ? 'medium' : ticket.priority === 'medium' ? 'high' : 'urgent'
          }
        }),
        prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderRole: 'system',
            text: reasonText,
            sentAt: now
          }
        })
      ]);

      escalatedCount++;
      console.log(`[SLA Escalation] Ticket ${ticket.ticketNumber} escalated to Tier ${nextTier}`);
    }

    return { escalatedCount };
  } catch (err) {
    console.error('[SLA Escalation Job Error]:', err.message);
    return { error: err.message };
  }
}

let _intervalId = null;

function startSlaEscalationJob(intervalMs = 5 * 60 * 1000) {
  if (_intervalId) clearInterval(_intervalId);
  console.log(`[SLA Escalation] Background SLA job scheduled every ${Math.round(intervalMs / 60000)} minutes.`);
  _intervalId = setInterval(checkAndEscalateTickets, intervalMs);
}

function stopSlaEscalationJob() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

module.exports = {
  checkAndEscalateTickets,
  startSlaEscalationJob,
  stopSlaEscalationJob
};
