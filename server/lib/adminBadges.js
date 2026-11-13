const prisma = require('./prisma');
const { getIo } = require('./socket');

/**
 * Live counts of operational queues requiring Super Admin attention
 */
async function fetchAdminBadgeCounts() {
  const [
    pendingVendors,
    pendingRiders,
    pendingRegionalAdmins,
    openTickets,
    pendingRefunds,
  ] = await Promise.all([
    prisma.vendor.count({ where: { approvalStatus: 'pending' } }),
    prisma.riderProfile.count({ where: { isApproved: false } }),
    prisma.regionalAdminProfile.count({ where: { status: 'pending_approval' } }),
    prisma.ticket.count({ where: { status: { in: ['open', 'in_progress'] } } }),
    prisma.order.count({ where: { refundStatus: 'pending' } }),
  ]);

  return {
    pendingVendors,
    pendingRiders,
    pendingRegionalAdmins,
    openTickets,
    pendingRefunds,
  };
}

/**
 * Broadcasts updated badge counts to Super Admin real-time sockets
 */
async function broadcastAdminBadgeCounts() {
  try {
    const io = getIo ? getIo() : null;
    if (io) {
      const counts = await fetchAdminBadgeCounts();
      io.to('panel:admin').emit('admin:badge_counts_updated', counts);
      io.emit('admin:badge_counts_updated', counts);
    }
  } catch (err) {
    console.warn('[BadgeCounts] Broadcast warning:', err.message);
  }
}

module.exports = {
  fetchAdminBadgeCounts,
  broadcastAdminBadgeCounts,
};

