'use strict';
/**
 * server/routes/vendor/analytics.js
 * Vendor Sales & Performance Analytics.
 * Strictly calculates revenue, order counts, and top products based on the vendor's own items.
 */

const express = require('express');
const prisma  = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('vendor'));

/** GET /api/vendor/analytics/summary — Sales analytics */
router.get('/summary', async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ error: 'Vendor profile not found.' });
    }

    const { period = '30d', startDate, endDate } = req.query;

    let since;
    let until = new Date();

    if (startDate || endDate) {
      since = startDate ? new Date(startDate) : new Date(0);
      if (endDate) {
        until = new Date(endDate);
        until.setHours(23, 59, 59, 999);
      }
    } else {
      const msMap = {
        '7d': 7,
        'monthly': 30,
        '30d': 30,
        '90d': 90,
        '6months': 180,
        '12months': 365,
        'yearly': 365,
      };
      const days = msMap[period] || 30;
      since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    // Match orders that contain at least one item from this vendor or have order.vendorId set
    const vendorOrderCondition = {
      OR: [
        { vendorId },
        { items: { some: { vendorId } } },
      ],
      status: { not: 'cancelled' },
    };

    // Fetch all relevant orders within the selected period
    const [periodOrders, allTimeOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          ...vendorOrderCondition,
          createdAt: { gte: since, lte: until },
        },
        include: {
          items: true,
          customer: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.findMany({
        where: vendorOrderCondition,
        include: {
          items: true,
        },
      }),
    ]);

    // Calculate all-time totals strictly for this vendor's items
    let allTimeGross = 0;
    let allTimeNet = 0;
    allTimeOrders.forEach(order => {
      const vendorItems = order.items.filter(it => it.vendorId === vendorId || (!it.vendorId && order.vendorId === vendorId));
      vendorItems.forEach(it => {
        const itemGross = (it.price || 0) * (it.quantity || 1);
        const itemNet = (it.vendorPrice != null ? it.vendorPrice : (it.price || 0) * 0.9) * (it.quantity || 1);
        allTimeGross += itemGross;
        allTimeNet += itemNet;
      });
    });

    // Calculate period stats
    let periodGross = 0;
    let periodNet = 0;
    const statusMap = {};
    const productMap = {};
    const dailyMap = {};

    const rawOrders = [];

    periodOrders.forEach(order => {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;

      // Filter only this vendor's items
      const vendorItems = order.items.filter(it => it.vendorId === vendorId || (!it.vendorId && order.vendorId === vendorId));
      if (vendorItems.length === 0) return;

      let orderVendorGross = 0;
      let orderVendorNet = 0;

      const day = order.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { _id: day, revenue: 0, netPayout: 0, orders: 0 };
      dailyMap[day].orders += 1;

      vendorItems.forEach(item => {
        const gross = (item.price || 0) * (item.quantity || 1);
        const net = (item.vendorPrice != null ? item.vendorPrice : (item.price || 0) * 0.9) * (item.quantity || 1);

        orderVendorGross += gross;
        orderVendorNet += net;
        periodGross += gross;
        periodNet += net;

        dailyMap[day].revenue += gross;
        dailyMap[day].netPayout += net;

        const pId = item.productId || item.name;
        if (!productMap[pId]) productMap[pId] = { _id: pId, name: item.name, revenue: 0, sold: 0 };
        productMap[pId].revenue += gross;
        productMap[pId].sold += item.quantity;
      });

      rawOrders.push({
        orderNumber: order.orderNumber,
        date: order.createdAt.toISOString().slice(0, 10),
        customerName: order.customer?.name || 'Walk-in Customer',
        customerEmail: order.customer?.email || '—',
        items: vendorItems.map(it => `${it.name} x${it.quantity}`).join('; '),
        totalAmount: Math.round(orderVendorGross * 100) / 100,
        netPayout: Math.round(orderVendorNet * 100) / 100,
        status: order.status,
        paymentMethod: order.paymentMethod || 'online',
        paymentStatus: order.paymentStatus || 'pending',
      });
    });

    const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({
      _id: status,
      count,
    }));

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }));

    const dailyRevenue = Object.values(dailyMap)
      .sort((a, b) => a._id.localeCompare(b._id))
      .map(d => ({
        ...d,
        revenue: Math.round(d.revenue * 100) / 100,
        netPayout: Math.round(d.netPayout * 100) / 100,
      }));

    res.json({
      allTime: {
        total: Math.round(allTimeGross * 100) / 100,
        netPayout: Math.round(allTimeNet * 100) / 100,
        count: allTimeOrders.length,
      },
      period: {
        total: Math.round(periodGross * 100) / 100,
        netPayout: Math.round(periodNet * 100) / 100,
        commission: Math.round((periodGross - periodNet) * 100) / 100,
        count: periodOrders.length,
      },
      ordersByStatus,
      topProducts,
      dailyRevenue,
      rawOrders: rawOrders.reverse(),
    });
  } catch (err) {
    console.error('[VendorAnalytics] error:', err);
    res.status(500).json({ error: err.message || 'Failed to load analytics summary.' });
  }
});

module.exports = router;
