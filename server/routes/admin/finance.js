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

    // Parallel aggregates across Orders, Ledger, Vendors, Riders, Remittances, Payouts, and Refunds
    const [
      ordersAgg,
      capturedPaymentsAgg,
      gatewayFeesAgg,
      vendorWalletsAgg,
      riderWalletsAgg,
      codFloatAgg,
      codRemittanceAgg,
      vendorPayoutsDisbursedAgg,
      riderPayoutsDisbursedAgg,
      pendingPayoutsAgg,
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

      // 6. Floating COD cash currently in field with riders
      prisma.riderProfile.aggregate({
        _sum: { codCashFloat: true },
      }),

      // 7. Completed COD cash remittances received in period
      prisma.cODRemittance.aggregate({
        where: {
          OR: [
            { status: 'paid_online' },
            { remittedToSuperAt: { not: null } },
            { status: 'verified' },
          ],
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 8. Completed Vendor Payouts disbursed in period
      prisma.payoutRequest.aggregate({
        where: {
          partyType: 'VENDOR',
          status: { in: ['approved', 'processed'] },
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 9. Completed Rider Fleet Payouts disbursed in period
      prisma.payoutRequest.aggregate({
        where: {
          partyType: 'RIDER',
          status: { in: ['approved', 'processed'] },
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 10. Pending Payout Requests awaiting clearance
      prisma.payoutRequest.aggregate({
        where: {
          status: 'pending',
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 11. Refunds processed in period
      prisma.ticket.aggregate({
        where: {
          refundStatus: 'approved',
          ...dateFilter,
        },
        _sum: { refundAmount: true },
        _count: { id: true },
      }),

      // 12. Gateway settlements summary
      prisma.gatewaySettlement.aggregate({
        where: dateFilter,
        _sum: { amount: true, fee: true, tax: true },
        _count: { id: true },
      }),

      // 13. Platform fee credits from Ledger
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
    const totalCodRemitted = codRemittanceAgg._sum.amount || 0;
    const totalGrossInflow = Math.round((grossCustomerPaid + totalCodRemitted) * 100) / 100;

    // Partner balances owed: Vendors + Riders
    const vendorOwed = vendorWalletsAgg._sum.walletBalance || 0;
    const riderOwed = riderWalletsAgg._sum.walletBalance || 0;
    const toBeCleared = Math.round((vendorOwed + riderOwed) * 100) / 100;

    // Disbursed Payouts
    const vendorPayoutsDisbursed = vendorPayoutsDisbursedAgg._sum.amount || 0;
    const riderPayoutsDisbursed = riderPayoutsDisbursedAgg._sum.amount || 0;
    const totalDisbursedToPartners = Math.round((vendorPayoutsDisbursed + riderPayoutsDisbursed) * 100) / 100;
    const pendingPayoutsCount = pendingPayoutsAgg._count.id || 0;
    const pendingPayoutsAmount = pendingPayoutsAgg._sum.amount || 0;

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
        totalCodRemitted: Math.round(totalCodRemitted * 100) / 100,
        totalGrossInflow,
        toBeCleared,
        vendorOwed: Math.round(vendorOwed * 100) / 100,
        riderOwed: Math.round(riderOwed * 100) / 100,
        vendorPayoutsDisbursed: Math.round(vendorPayoutsDisbursed * 100) / 100,
        riderPayoutsDisbursed: Math.round(riderPayoutsDisbursed * 100) / 100,
        totalDisbursedToPartners,
        pendingPayoutsCount,
        pendingPayoutsAmount: Math.round(pendingPayoutsAmount * 100) / 100,
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
 * Comprehensive Platform Financial Reconciliation Ledger:
 * Combines Gateway Settlements, Completed Payout Disbursements, and COD Inflows.
 */
router.get('/settlements', async (req, res) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Fetch in parallel: Gateway settlements, completed Payouts, and COD remittances
    const [settlements, payouts, remittances] = await Promise.all([
      prisma.gatewaySettlement.findMany({
        orderBy: { createdAt: 'desc' },
        take: limitNum,
      }),
      prisma.payoutRequest.findMany({
        where: { status: { in: ['approved', 'processed'] } },
        include: {
          vendor: { select: { businessName: true } },
          riderProfile: { include: { user: { select: { name: true } } } },
        },
        orderBy: { requestedAt: 'desc' },
        take: limitNum,
      }),
      prisma.cODRemittance.findMany({
        where: {
          OR: [{ status: 'paid_online' }, { remittedToSuperAt: { not: null } }, { status: 'verified' }],
        },
        include: {
          riderProfile: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
      }),
    ]);

    // Map into unified financial records
    const unified = [];

    settlements.forEach((s) => {
      unified.push({
        id: s.id,
        category: 'GATEWAY_SETTLEMENT',
        direction: 'INFLOW',
        settlementId: s.settlementId,
        partyName: 'Razorpay Nodal Account',
        utr: s.utr || '—',
        amount: s.amount,
        fees: (s.fees || 0) + (s.tax || 0),
        netAmount: s.amount - ((s.fees || 0) + (s.tax || 0)),
        status: s.status || 'settled',
        date: s.createdAt,
      });
    });

    remittances.forEach((r) => {
      unified.push({
        id: r.id,
        category: 'COD_REMITTANCE',
        direction: 'INFLOW',
        settlementId: r.razorpayPaymentId || r.superAdminRazorpayId || `COD-${r.id.slice(0, 8)}`,
        partyName: `${r.riderProfile?.user?.name || 'Rider'} (COD Remit)`,
        utr: r.superAdminRazorpayId || r.razorpayPaymentId || '—',
        amount: r.amount,
        fees: 0,
        netAmount: r.amount,
        status: r.status || 'received',
        date: r.remittedToSuperAt || r.receivedByAdminAt || r.createdAt,
      });
    });

    payouts.forEach((p) => {
      const recipient = p.partyType === 'VENDOR' ? p.vendor?.businessName || 'Merchant' : p.riderProfile?.user?.name || 'Rider';
      unified.push({
        id: p.id,
        category: p.partyType === 'VENDOR' ? 'VENDOR_PAYOUT' : 'RIDER_PAYOUT',
        direction: 'OUTFLOW',
        settlementId: p.razorpayPayoutId || `PAY-${p.id.slice(0, 8)}`,
        partyName: `${recipient} (${p.partyType})`,
        utr: p.razorpayPayoutId || (p.bankSnapshot && p.bankSnapshot.utr) || 'Direct Clearance',
        amount: p.amount,
        fees: 0,
        netAmount: p.amount,
        status: p.status,
        date: p.processedAt || p.reviewedAt || p.requestedAt,
      });
    });

    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      settlements: unified.slice(0, limitNum),
      total: unified.length,
      page: pageNum,
      pages: Math.ceil(unified.length / limitNum),
    });
  } catch (err) {
    console.error('[AdminFinance] Settlements error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch settlements.' });
  }
});

module.exports = router;
