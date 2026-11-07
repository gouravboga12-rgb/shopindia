'use strict';
/**
 * server/routes/admin/finance.js
 * Super Admin Master Finance Center & 3-Vertical Profit Ledger.
 * Real-time reconciliation of Customer Paid, 3% Razorpay Gateway Fees,
 * Vendor/Technician Payouts, and Net Super Admin Profit across:
 * 1) Shop India (Courier E-Commerce)
 * 2) Quick Shopping (Hyperlocal 10-20 Min Delivery)
 * 3) Glacons (Doorstep Services & Repairs)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('super_admin'));

/**
 * Helper to compute date bounds based on period string or custom dates
 */
function getDateBounds(period, startDate, endDate) {
  let since;
  let until = new Date();

  if (startDate || endDate) {
    since = startDate ? new Date(startDate) : new Date(0);
    if (endDate) {
      until = new Date(endDate);
      until.setHours(23, 59, 59, 999);
    }
    return { since, until };
  }

  const now = new Date();
  if (period === 'today') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    until = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'yesterday') {
    const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    since = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0);
    until = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
  } else if (period === '7d') {
    since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30d') {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === '90d') {
    since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (period === '12months' || period === '365d') {
    since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  } else if (period === 'all') {
    since = new Date(0);
  } else {
    since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { since, until };
}

/**
 * GET /api/admin/finance/overview
 * Returns transparent 3-channel profit breakdown + Grand Total box + order-by-order profit ledger
 */
router.get('/overview', async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    const { since, until } = getDateBounds(period, startDate, endDate);
    const dateFilter = { createdAt: { gte: since, lte: until } };

    // Fetch orders in date range with items & vendor/tech relation
    const orders = await prisma.order.findMany({
      where: {
        status: { not: 'cancelled' },
        ...dateFilter,
      },
      include: {
        items: {
          select: {
            price: true,
            vendorPrice: true,
            quantity: true,
            platformFee: true,
            gatewayFeeShare: true,
          },
        },
        vendor: {
          select: {
            businessName: true,
          },
        },
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
        paymentRecord: {
          select: {
            gatewayFee: true,
            gatewayTax: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Channel summaries
    const channels = {
      shop_india: {
        channelKey: 'shop_india',
        label: 'Shop India (Courier)',
        badge: '🛍️',
        customerPaid: 0,
        vendorPayout: 0,
        razorpayFee: 0,
        adminNetProfit: 0,
        ordersCount: 0,
        marginPercent: 0,
      },
      quick_shopping: {
        channelKey: 'quick_shopping',
        label: 'Quick Shopping (10-20 Min)',
        badge: '⚡',
        customerPaid: 0,
        vendorPayout: 0,
        razorpayFee: 0,
        adminNetProfit: 0,
        ordersCount: 0,
        marginPercent: 0,
      },
      glacons: {
        channelKey: 'glacons',
        label: 'Glacons Doorstep Services',
        badge: '🛠️',
        customerPaid: 0,
        vendorPayout: 0,
        razorpayFee: 0,
        adminNetProfit: 0,
        ordersCount: 0,
        marginPercent: 0,
      },
    };

    // Grand Total summary across all 3 channels
    const summary = {
      totalCustomerPaid: 0,
      totalVendorPayout: 0,
      totalRazorpayFee: 0,
      totalAdminNetProfit: 0,
      totalOrdersCount: 0,
      marginPercent: 0,
    };

    // Map orders into transparent profit rows
    const mappedOrders = orders.map((order) => {
      // Determine vertical channel
      let channel = 'shop_india';
      let channelLabel = 'Shop India';
      if (order.type === 'quick_commerce') {
        channel = 'quick_shopping';
        channelLabel = 'Quick Shopping';
      } else if (order.type === 'hvac' || order.type === 'hvac_service') {
        channel = 'glacons';
        channelLabel = 'Glacons Services';
      }

      const customerPaid = Number(order.total || order.subtotal || 0);

      // Razorpay gateway fee: 3% standard (or from paymentRecord if captured)
      let razorpayFee = 0;
      if (order.paymentRecord && (order.paymentRecord.gatewayFee || order.paymentRecord.gatewayTax)) {
        razorpayFee = Number(order.paymentRecord.gatewayFee || 0) + Number(order.paymentRecord.gatewayTax || 0);
      } else {
        razorpayFee = Math.round(customerPaid * 0.03 * 100) / 100;
      }

      // Vendor / Technician Payout calculation
      let vendorPayout = 0;
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const qty = item.quantity || 1;
          if (item.vendorPrice != null && item.vendorPrice > 0) {
            vendorPayout += Number(item.vendorPrice) * qty;
          } else if (item.platformFee != null && item.platformFee > 0) {
            vendorPayout += Math.max(0, (Number(item.price) - Number(item.platformFee)) * qty);
          } else {
            // Default: 85% vendor share, 15% platform commission
            vendorPayout += Number(item.price) * qty * 0.85;
          }
        }
      } else {
        vendorPayout = order.commission ? Math.max(0, customerPaid - Number(order.commission)) : customerPaid * 0.85;
      }
      vendorPayout = Math.round(vendorPayout * 100) / 100;

      // Super Admin Net Profit = Customer Paid - Vendor Payout - Razorpay 3%
      const adminNetProfit = Math.round((customerPaid - vendorPayout - razorpayFee) * 100) / 100;

      // Accumulate to channel
      channels[channel].customerPaid += customerPaid;
      channels[channel].vendorPayout += vendorPayout;
      channels[channel].razorpayFee += razorpayFee;
      channels[channel].adminNetProfit += adminNetProfit;
      channels[channel].ordersCount += 1;

      // Accumulate to grand total summary
      summary.totalCustomerPaid += customerPaid;
      summary.totalVendorPayout += vendorPayout;
      summary.totalRazorpayFee += razorpayFee;
      summary.totalAdminNetProfit += adminNetProfit;
      summary.totalOrdersCount += 1;

      return {
        id: order.id,
        orderNumber: order.orderNumber || `OD-${order.id.slice(0, 8).toUpperCase()}`,
        channel,
        channelLabel,
        customerPaid: Math.round(customerPaid * 100) / 100,
        vendorPayout: Math.round(vendorPayout * 100) / 100,
        razorpayFee: Math.round(razorpayFee * 100) / 100,
        adminNetProfit: Math.round(adminNetProfit * 100) / 100,
        marginPercent: customerPaid > 0 ? Math.round(((adminNetProfit / customerPaid) * 100) * 10) / 10 : 0,
        paymentMethod: order.paymentMethod || 'Razorpay Online',
        paymentStatus: order.paymentStatus || 'paid',
        status: order.status,
        customerName: order.customer?.name || 'Customer',
        partnerName: order.vendor?.businessName || (channel === 'glacons' ? 'Glacons Technician' : 'Store Partner'),
        createdAt: order.createdAt,
      };
    });

    // Round all channel summaries and compute profit margin percentages
    Object.keys(channels).forEach((key) => {
      const ch = channels[key];
      ch.customerPaid = Math.round(ch.customerPaid * 100) / 100;
      ch.vendorPayout = Math.round(ch.vendorPayout * 100) / 100;
      ch.razorpayFee = Math.round(ch.razorpayFee * 100) / 100;
      ch.adminNetProfit = Math.round(ch.adminNetProfit * 100) / 100;
      ch.marginPercent = ch.customerPaid > 0 ? Math.round(((ch.adminNetProfit / ch.customerPaid) * 100) * 10) / 10 : 0;
    });

    // Round grand summary
    summary.totalCustomerPaid = Math.round(summary.totalCustomerPaid * 100) / 100;
    summary.totalVendorPayout = Math.round(summary.totalVendorPayout * 100) / 100;
    summary.totalRazorpayFee = Math.round(summary.totalRazorpayFee * 100) / 100;
    summary.totalAdminNetProfit = Math.round(summary.totalAdminNetProfit * 100) / 100;
    summary.marginPercent = summary.totalCustomerPaid > 0
      ? Math.round(((summary.totalAdminNetProfit / summary.totalCustomerPaid) * 100) * 10) / 10
      : 0;

    // Parallel counts for active stores & technicians
    const [activeVendors, activeTechnicians] = await Promise.all([
      prisma.vendor.count({ where: { isActive: true } }),
      prisma.technician ? prisma.technician.count({ where: { isActive: true } }).catch(() => 0) : 0,
    ]);

    // Backwards-compatible metrics object so legacy callers don't fail
    const legacyMetrics = {
      grossCustomerPaid: summary.totalCustomerPaid,
      actualGatewayFees: summary.totalRazorpayFee,
      netReceived: Math.max(0, summary.totalCustomerPaid - summary.totalRazorpayFee),
      totalGrossInflow: summary.totalCustomerPaid,
      toBeCleared: summary.totalVendorPayout,
      totalDisbursedToPartners: summary.totalVendorPayout,
      platformNetProfit: summary.totalAdminNetProfit,
      paidOrdersCount: summary.totalOrdersCount,
      activeVendorsCount: activeVendors,
      activeRidersCount: activeTechnicians,
    };

    res.json({
      success: true,
      period,
      since,
      until,
      summary,
      channels,
      orders: mappedOrders,
      metrics: legacyMetrics,
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
        where: { status: { in: ['approved', 'processing', 'completed'] } },
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
