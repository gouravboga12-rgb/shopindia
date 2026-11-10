'use strict';

const prisma = require('./prisma');

/**
 * Calculates unified platform treasury metrics across:
 * 1. Admin Net Profit (Platform commission margin from completed/paid orders)
 * 2. Amount Pending to Vendors (Wholesale earnings owed to merchants left to clear)
 * 3. Amount Pending to Riders & Technicians (Delivery/repair fees owed to fleet left to clear)
 * 4. Total Cleared / Paid Out (Disbursed to partners with UTR proof)
 */
async function getPlatformTreasuryStats() {
  const [
    revenueAgg,
    vendorBalances,
    riderBalances,
    vendorPendingPayouts,
    riderPendingPayouts,
    vendorCompletedPayouts,
    riderCompletedPayouts,
  ] = await Promise.all([
    // 1. Admin Net Profit from paid orders (excluding cancelled/refunded)
    prisma.order.aggregate({
      _sum: { total: true, commission: true },
      where: {
        paymentStatus: 'paid',
        status: { notIn: ['cancelled', 'refunded', 'returned'] },
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

  const adminProfit = Math.round((revenueAgg._sum?.commission || 0) * 100) / 100;
  const grossCustomerPaid = Math.round((revenueAgg._sum?.total || 0) * 100) / 100;

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

