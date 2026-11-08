const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      paymentMethod: true,
      createdAt: true,
      delivery: {
        select: {
          id: true,
          riderProfileId: true,
          deliveryFee: true,
          status: true,
          deliveredAt: true
        }
      }
    }
  });
  console.log('=== ALL ORDERS IN DB ===');
  console.dir(orders, { depth: null });

  const payoutRequests = await prisma.payoutRequest.findMany({
    include: {
      riderProfile: {
        include: { user: { select: { name: true } } }
      }
    }
  });
  console.log('=== ALL PAYOUT REQUESTS IN DB ===');
  console.dir(payoutRequests, { depth: null });

  const remittances = await prisma.codRemittance.findMany({
    include: {
      riderProfile: {
        include: { user: { select: { name: true } } }
      }
    }
  });
  console.log('=== ALL COD REMITTANCES IN DB ===');
  console.dir(remittances, { depth: null });

  const riders = await prisma.riderProfile.findMany({
    select: {
      id: true,
      walletBalance: true,
      codCashFloat: true,
      totalDeliveries: true,
      user: { select: { name: true, phone: true } }
    }
  });
  console.log('=== ALL RIDERS SUMMARY ===');
  console.dir(riders, { depth: null });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
