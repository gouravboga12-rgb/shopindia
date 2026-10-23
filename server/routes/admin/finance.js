'use strict';
/**
 * server/routes/admin/finance.js
 * Super Admin Master Finance Center & CFO Balance Sheet.
 * Real-time reconciliation of Customer Paid, Gateway Fees, Net Received,
 * Partner Balances Owed (To Be Cleared), and Platform Net Profit.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('super_admin'));

/**
 * GET /api/admin/finance/overview
 * Real-time platform balance sheet and P&L breakdown
 */
router.get('/overview', async (req, res) => {
  try {
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
        '30d': 30,
        '90d': 90,
        '12months': 365,
        'all': 0,
      };
      const days = msMap[period] ?? 30;
      since = days === 0 ? new Date(0) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    const dateFilter = { createdAt: { gte: since, lte: until } };

    // Parallel aggregates across Orders, Ledger, Vendors, Riders, and Refunds
    const [
      ordersAgg,
      capturedPaymentsAgg,
      gatewayFeesAgg,
      vendorWalletsAgg,
      riderWalletsAgg,
      codFloatAgg,
      refundsAgg,
      settlementsAgg,
      platformLedgerAgg,
    ] = await Promise.all([
      // 1. Orders total & commissions in period
      prisma.order.aggregate({
        where: {
          status: { not: 'cancelled' },
          paymentStatus: 'paid',
          ...dateFilter,
        },
        _sum: { total: true, subtotal: true, commission: true, discount: true },
        _count: { id: true },
      }),

      // 2. Captured payments from Razorpay
      prisma.paymentRecord.aggregate({
        where: { status: 'captured', ...dateFilter },
        _sum: { amount: true, gatewayFee: true, gatewayTax: true },
        _count: { id: true },
      }),

      // 3. Actual gateway fee debits from Ledger
      prisma.ledgerEntry.aggregate({
        where: {
          entryType: { in: ['GATEWAY_FEE', 'GATEWAY_TAX'] },
          ...dateFilter,
        },
        _sum: { amount: true },
      }),

      // 4. Partner funds owed to vendors (To Be Cleared)
      prisma.vendor.aggregate({
        _sum: { walletBalance: true },
        _count: { id: true },
      }),

      // 5. Partner funds owed to riders (To Be Cleared)
      prisma.riderProfile.aggregate({
        _sum: { walletBalance: true },
        _count: { id: true },
      }),

      // 6. Floating COD cash held by riders
      prisma.riderProfile.aggregate({
        _sum: { codCashFloat: true },
      }),

      // 7. Refunds processed in period
      prisma.ticket.aggregate({
        where: {
          refundStatus: 'approved',
          ...dateFilter,
        },
        _sum: { refundAmount: true },
        _count: { id: true },
      }),

      // 8. Gateway settlements summary
      prisma.gatewaySettlement.aggregate({
        where: dateFilter,
        _sum: { amount: true, fee: true, tax: true },
        _count: { id: true },
      }),

      // 9. Platform fee credits from Ledger
      prisma.ledgerEntry.aggregate({
        where: {
          party: 'PLATFORM',
          type: 'CREDIT',
          ...dateFilter,
        },
        _sum: { amount: true },
      }),
    ]);

    // Financial Computations
    const grossCustomerPaid = ordersAgg._sum.total || 0;
    const actualGatewayFees = gatewayFeesAgg._sum.amount || (capturedPaymentsAgg._sum.gatewayFee || 0) + (capturedPaymentsAgg._sum.gatewayTax || 0);
    const netReceived = Math.max(0, grossCustomerPaid - actualGatewayFees);

    // Partner balances owed: Vendors + Riders
    const vendorOwed = vendorWalletsAgg._sum.walletBalance || 0;
    const riderOwed = riderWalletsAgg._sum.walletBalance || 0;
    const toBeCleared = Math.round((vendorOwed + riderOwed) * 100) / 100;

    // Platform Net Profit = Gross Commission + Platform Fees - Gateway Fees - Platform Coupon Subsidies
    const grossCommission = ordersAgg._sum.commission || 0;
    const platformCredits = platformLedgerAgg._sum.amount || grossCommission;
    const platformNetProfit = Math.round((platformCredits - actualGatewayFees) * 100) / 100;

    const codCashWithRiders = Math.round((codFloatAgg._sum.codCashFloat || 0) * 100) / 100;
    const totalRefunds = Math.round((refundsAgg._sum.refundAmount || 0) * 100) / 100;

    // Detailed refund breakdown by atFault
    const refundsByAtFault = await prisma.ticket.groupBy({
      by: ['refundAtFault'],
      where: { refundStatus: 'approved', ...dateFilter },
      _sum: { refundAmount: true },
      _count: { id: true },
    });

    const refundBreakdown = {
      vendor: 0,
      rider: 0,
      platform: 0,
    };
    refundsByAtFault.forEach(r => {
      const fault = r.refundAtFault || 'platform';
      refundBreakdown[fault] = Math.round((r._sum.refundAmount || 0) * 100) / 100;
    });

    res.json({
      success: true,
      period,
      metrics: {
        grossCustomerPaid: Math.round(grossCustomerPaid * 100) / 100,
        actualGatewayFees: Math.round(actualGatewayFees * 100) / 100,
        netReceived: Math.round(netReceived * 100) / 100,
        toBeCleared,
        vendorOwed: Math.round(vendorOwed * 100) / 100,
        riderOwed: Math.round(riderOwed * 100) / 100,
        platformNetProfit,
        grossCommission: Math.round(grossCommission * 100) / 100,
        codCashWithRiders,
        totalRefunds,
        refundBreakdown,
        paidOrdersCount: ordersAgg._count.id || 0,
        activeVendorsCount: vendorWalletsAgg._count.id || 0,
        activeRidersCount: riderWalletsAgg._count.id || 0,
        settlementsCount: settlementsAgg._count.id || 0,
        settledAmount: Math.round((settlementsAgg._sum.amount || 0) * 100) / 100,
      },
    });
  } catch (err) {
    console.error('[AdminFinance] Overview error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate financial overview.' });
  }
});

/**
 * GET /api/admin/finance/settlements
 * Razorpay automated bank settlement ledger
 */
router.get('/settlements', async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [settlements, total] = await Promise.all([
      prisma.gatewaySettlement.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.gatewaySettlement.count(),
    ]);

    res.json({
      success: true,
      settlements,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('[AdminFinance] Settlements error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch settlements.' });
  }
});

module.exports = router;
