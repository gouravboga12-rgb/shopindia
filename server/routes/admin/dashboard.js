const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }       = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();

// All dashboard routes require auth + manage_dashboard permission (or super_admin)
router.use(verifyToken, requirePermission('manage_dashboard', 'view_dashboard'));

/** GET /api/admin/dashboard — FR-05.1 — main stats + chart */
router.get('/', async (req, res) => {
  try {
    const branchFilter = (req.user.role === 'branch_manager' && req.user.branchId)
      ? { branchId: req.user.branchId }
      : {};

    const [
      totalUsers, totalVendors, totalRiders, totalOrders,
      pendingVendors, openTickets, revenueAgg,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'customer', ...branchFilter } }),
      prisma.user.count({ where: { role: 'vendor' } }),
      prisma.user.count({ where: { role: 'rider', ...branchFilter } }),
      prisma.order.count({
        where: {
          status: { notIn: ['cancelled', 'refunded', 'returned'] },
          paymentStatus: { notIn: ['refunded', 'failed'] },
          ...branchFilter,
        },
      }),
      prisma.vendor.count({ where: { approvalStatus: 'pending' } }),
      prisma.ticket.count({ where: { status: { in: ['open', 'in_progress'] } } }), // Not filtered by branch yet for simplicity
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: 'paid',
          status: { notIn: ['cancelled', 'refunded', 'returned'] },
          ...branchFilter,
        },
      }),
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: { notIn: ['cancelled', 'refunded', 'returned'] },
        paymentStatus: { notIn: ['refunded', 'failed'] },
        ...branchFilter,
      },
      select: { createdAt: true, total: true },
    });

    const dailyMap = {};
    recentOrders.forEach((o) => {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { _id: day, count: 0, revenue: 0 };
      dailyMap[day].count += 1;
      dailyMap[day].revenue += (o.total || 0);
    });
    const dailyOrders = Object.values(dailyMap).sort((a, b) => a._id.localeCompare(b._id));

    res.json({
      stats: {
        totalUsers,
        totalVendors,
        totalRiders,
        totalOrders,
        pendingVendors,
        openTickets,
        totalRevenue: revenueAgg._sum.total || 0,
      },
      dailyOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Compute date range and grouping from query params.
 * Params: range ('7d'|'3m'|'6m'|'12m'), date ('YYYY-MM-DD'), year ('YYYY')
 */
function buildFilter(query) {
  const { range = '7d', date, year } = query;
  const now = new Date();
  let startDate, endDate, groupBy;

  if (date) {
    // Single day → hourly bars
    startDate = new Date(`${date}T00:00:00.000Z`);
    endDate   = new Date(`${date}T23:59:59.999Z`);
    groupBy   = 'hour';
  } else if (year) {
    // Full year → monthly bars
    startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    endDate   = new Date(`${year}-12-31T23:59:59.999Z`);
    groupBy   = 'month';
  } else {
    const daysMap = { '7d': 7, '3m': 90, '6m': 180, '12m': 365 };
    const days = daysMap[range] ?? 7;
    startDate = new Date(now - days * 864e5);
    endDate   = now;
    groupBy   = (range === '6m' || range === '12m') ? 'month' : 'day';
  }

  return { startDate, endDate, groupBy };
}

/**
 * GET /api/admin/dashboard/revenue-chart
 * Query: range | date | year
 * Returns grouped chart data for the revenue bar chart.
 */
router.get('/revenue-chart', async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = buildFilter(req.query);

    const branchFilter = (req.user.role === 'branch_manager' && req.user.branchId)
      ? { branchId: req.user.branchId }
      : {};

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['cancelled', 'refunded', 'returned'] },
        paymentStatus: { notIn: ['refunded', 'failed'] },
        ...branchFilter,
      },
      select: { createdAt: true, total: true },
    });

    const map = {};
    orders.forEach((o) => {
      let key;
      if (groupBy === 'hour') {
        // Use local hour label e.g. "09:00"
        key = `${String(o.createdAt.getUTCHours()).padStart(2, '0')}:00`;
      } else if (groupBy === 'month') {
        key = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
      } else {
        key = o.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      }
      if (!map[key]) map[key] = { _id: key, count: 0, revenue: 0 };
      map[key].count   += 1;
      map[key].revenue += (o.total || 0);
    });

    const chartData = Object.values(map).sort((a, b) => a._id.localeCompare(b._id));
    res.json({ chartData, groupBy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/dashboard/revenue-export
 * Same filter params as /revenue-chart.
 * Returns CSV-ready JSON array (UI converts to .csv download).
 */
router.get('/revenue-export', async (req, res) => {
  try {
    const { startDate, endDate } = buildFilter(req.query);

    const branchFilter = (req.user.role === 'branch_manager' && req.user.branchId)
      ? { branchId: req.user.branchId }
      : {};

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, ...branchFilter },
      select: {
        orderNumber:   true,
        total:         true,
        status:        true,
        paymentStatus: true,
        createdAt:     true,
        customer: { select: { name: true, email: true } },
        vendor:   { select: { businessName: true } },
        branch:   { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = orders.map(o => ({
      Order_ID:       o.orderNumber,
      Date:           o.createdAt.toISOString().split('T')[0],
      Time:           o.createdAt.toTimeString().slice(0, 5),
      Customer:       o.customer?.name  || 'N/A',
      Email:          o.customer?.email || 'N/A',
      Vendor:         o.vendor?.businessName || 'N/A',
      Branch:         o.branch?.name || 'Online',
      Amount_INR:     o.total || 0,
      Order_Status:   o.status,
      Payment_Status: o.paymentStatus,
    }));

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
