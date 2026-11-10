'use strict';

const prisma = require('./prisma');

/**
 * Calculates unified platform treasury metrics across:
 * 1. Admin Net Profit (Exact platform retained profit: Customer Paid - Wholesale Partner Share - 3% Gateway Fee)
 * 2. Amount Pending to Vendors (Wholesale earnings owed to merchants left to clear)
 * 3. Amount Pending to Riders & Technicians (Delivery/repair fees owed to fleet left to clear)
 * 4. Total Cleared / Paid Out (Disbursed to partners with UTR proof)
 */
async function getPlatformTreasuryStats() {
  const [
    paidOrders,
    vendorBalances,
    riderBalances,
    vendorPendingPayouts,
    riderPendingPayouts,
    vendorCompletedPayouts,
    riderCompletedPayouts,
  ] = await Promise.all([
    // 1. Paid active orders for exact Net Retained Margin calculation
    prisma.order.findMany({
      where: {
        paymentStatus: 'paid',
        status: { notIn: ['cancelled', 'refunded', 'returned'] },
      },
      select: {
        total: true,
        subtotal: true,
        commission: true,
        items: {
          select: {
            price: true,
            vendorPrice: true,
            quantity: true,
            platformFee: true,
          },
        },
      },
    }),
    // 2. Sum of vendor wallet balances (> 0)
    prisma.vendor.aggregate({
      _sum: { walletBalance: true },
      where: { walletBalance: { gt: 0 } },
    }),
    // 3. Sum of rider wallet balances (> 0)
    prisma.riderProfile.aggregate({
      _sum: { walletBalance: true },
      where: { walletBalance: { gt: 0 } },
    }),
    // 4. Pending vendor payout requests
    prisma.payoutRequest.aggregate({
      _sum: { amount: true },
      where: {
        partyType: 'VENDOR',
        status: { in: ['pending', 'approved', 'under_review', 'processing'] },
      },
    }),
    // 5. Pending rider payout requests
    prisma.payoutRequest.aggregate({
      _sum: { amount: true },
      where: {
        partyType: 'RIDER',
        status: { in: ['pending', 'approved', 'under_review', 'processing'] },
      },
    }),
    // 6. Completed vendor payouts
    prisma.payoutRequest.aggregate({
      _sum: { amount: true },
      where: { partyType: 'VENDOR', status: 'completed' },
    }),
    // 7. Completed rider payouts
    prisma.payoutRequest.aggregate({
      _sum: { amount: true },
      where: { partyType: 'RIDER', status: 'completed' },
    }),
  ]);

  let totalCustomerPaid = 0;
  let totalAdminProfit = 0;

  for (const order of paidOrders) {
    const rawTotal = Number(order.total || order.subtotal || 0);
    totalCustomerPaid += rawTotal;

    let baseVendorPayout = 0;
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const qty = item.quantity || 1;
        if (item.vendorPrice != null && item.vendorPrice > 0) {
          baseVendorPayout += Number(item.vendorPrice) * qty;
        } else if (item.platformFee != null && item.platformFee > 0) {
          baseVendorPayout += Math.max(0, (Number(item.price) - Number(item.platformFee)) * qty);
        } else {
          baseVendorPayout += Number(item.price) * qty * 0.85;
        }
      }
    } else {
      baseVendorPayout = order.commission ? Math.max(0, rawTotal - Number(order.commission)) : rawTotal * 0.85;
    }

    const effectiveRazorpayFee = Math.round(rawTotal * 0.03 * 100) / 100;
    const profit = Math.max(0, rawTotal - baseVendorPayout - effectiveRazorpayFee);
    totalAdminProfit += profit;
  }

  const adminProfit = Math.round(totalAdminProfit * 100) / 100;
  const grossCustomerPaid = Math.round(totalCustomerPaid * 100) / 100;

  const vendorWalletSum = Number(vendorBalances._sum?.walletBalance || 0);
  const vendorPendingSum = Number(vendorPendingPayouts._sum?.amount || 0);
  const pendingVendorPayout = Math.max(
    Math.round(vendorPendingSum * 100) / 100,
    Math.round(vendorWalletSum * 100) / 100
  );

  const riderWalletSum = Number(riderBalances._sum?.walletBalance || 0);
  const riderPendingSum = Number(riderPendingPayouts._sum?.amount || 0);
  const pendingRiderPayout = Math.max(
    Math.round(riderPendingSum * 100) / 100,
    Math.round(riderWalletSum * 100) / 100
  );

  const totalVendorPaidOut = Math.round((vendorCompletedPayouts._sum?.amount || 0) * 100) / 100;
  const totalRiderPaidOut = Math.round((riderCompletedPayouts._sum?.amount || 0) * 100) / 100;
  const totalPaidOut = Math.round((totalVendorPaidOut + totalRiderPaidOut) * 100) / 100;

  return {
    adminProfit,
    grossCustomerPaid,
    pendingVendorPayout,
    pendingRiderPayout,
    totalVendorPaidOut,
    totalRiderPaidOut,
    totalPaidOut,
  };
}

module.exports = {
  getPlatformTreasuryStats,
};

