const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- RECALCULATING RIDER WALLET BALANCES & COD FLOATS ---');
  const riders = await prisma.riderProfile.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      deliveries: {
        where: { status: 'delivered' },
        select: { id: true, deliveryFee: true, deliveredAt: true },
      },
      payouts: {
        where: { status: 'completed' },
        select: { id: true, amount: true },
      },
    },
  });

  for (const rider of riders) {
    const totalEarnedFees = rider.deliveries.reduce((sum, d) => sum + (d.deliveryFee || 50), 0);
    const totalPaidPayouts = rider.payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
    const correctWalletBalance = Math.max(0, totalEarnedFees - totalPaidPayouts);

    console.log(`Rider: ${rider.user?.name || rider.id}`);
    console.log(`  Current Wallet: ₹${rider.walletBalance} -> Correct Recalculated Wallet: ₹${correctWalletBalance} (${rider.deliveries.length} trips, ₹${totalEarnedFees} earned, ₹${totalPaidPayouts} paid out)`);

    await prisma.riderProfile.update({
      where: { id: rider.id },
      data: {
        walletBalance: correctWalletBalance,
        totalDeliveries: rider.deliveries.length,
      },
    });
  }

  console.log('--- RECALCULATION COMPLETE ---');
}

main()
  .catch(err => {
    console.error('Error during recalculation:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
