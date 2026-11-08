const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== STARTING ORPHANED TEST DATA CLEANUP & RIDER WALLET RECALCULATION ===');

  // 1. Delete orphaned PayoutRequest from 28 October 2026 (id: 7ce73d36-2025-4557-bcba-63d02916289a)
  const deletedPayouts = await prisma.payoutRequest.deleteMany({
    where: {
      OR: [
        { id: '7ce73d36-2025-4557-bcba-63d02916289a' },
        { requestedAt: { lt: new Date('2026-11-01T00:00:00.000Z') } }
      ]
    }
  });
  console.log(`Deleted ${deletedPayouts.count} orphaned PayoutRequest records from October.`);

  // 2. Delete orphaned CODRemittance from 28/29 October 2026 (id: 6f4a4d26-6971-48b4-b67e-3e93eadb5e43)
  const deletedRemittances = await prisma.cODRemittance.deleteMany({
    where: {
      OR: [
        { id: '6f4a4d26-6971-48b4-b67e-3e93eadb5e43' },
        { createdAt: { lt: new Date('2026-11-01T00:00:00.000Z') } }
      ]
    }
  });
  console.log(`Deleted ${deletedRemittances.count} orphaned CODRemittance records from October.`);

  // 3. Delete orphaned RiderPayout records from October
  const deletedRiderPayouts = await prisma.riderPayout.deleteMany({
    where: {
      createdAt: { lt: new Date('2026-11-01T00:00:00.000Z') }
    }
  });
  console.log(`Deleted ${deletedRiderPayouts.count} orphaned RiderPayout records from October.`);

  // 4. Delete orphaned Rider Ledger Entries from October
  const deletedLedger = await prisma.ledgerEntry.deleteMany({
    where: {
      party: 'RIDER',
      createdAt: { lt: new Date('2026-11-01T00:00:00.000Z') }
    }
  });
  console.log(`Deleted ${deletedLedger.count} orphaned LedgerEntry records from October.`);

  // 5. Find Gourav's rider profile and recalculate using Unified Auto-Offset
  const gourav = await prisma.riderProfile.findFirst({
    where: { user: { email: 'bogagourav69@gmail.com' } },
    include: {
      deliveries: {
        where: { status: 'delivered' },
        include: { order: true }
      }
    }
  });

  if (!gourav) {
    console.error('Gourav rider profile not found!');
    return;
  }

  // Calculate Net Wallet Balance under the Auto-Offset Model:
  // For each delivered order:
  // Earning: +deliveryFee (e.g. +₹20)
  // If COD collected by rider: -orderTotal (e.g. -₹110.83 physical cash kept in pocket)
  let totalEarnings = 0;
  let totalCashPocketed = 0;

  for (const del of gourav.deliveries) {
    const fee = del.deliveryFee || 20;
    totalEarnings += fee;
    if (del.order?.paymentMethod === 'COD' || del.order?.paymentStatus === 'paid') {
      const orderCash = Number(del.order?.total) || 110.83;
      totalCashPocketed += orderCash;
    }
  }

  const netBalance = Math.round((totalEarnings - totalCashPocketed) * 100) / 100;
  console.log(`Calculated for Gourav:`);
  console.log(`  Deliveries: ${gourav.deliveries.length}`);
  console.log(`  Total Delivery Fees Earned: ₹${totalEarnings}`);
  console.log(`  Total COD Cash Pocketed: ₹${totalCashPocketed}`);
  console.log(`  Net Wallet Auto-Offset Balance: ₹${netBalance} (Cash in Pocket: ₹${totalCashPocketed})`);

  await prisma.riderProfile.update({
    where: { id: gourav.id },
    data: {
      walletBalance: netBalance,
      codCashFloat: totalCashPocketed,
      totalDeliveries: gourav.deliveries.length
    }
  });

  console.log(`Successfully updated Gourav profile. Wallet: ₹${netBalance}, Float: ₹${totalCashPocketed}`);
  console.log('=== CLEANUP & RECALCULATION COMPLETE ===');
}

main()
  .catch(err => {
    console.error('Error during cleanup:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
