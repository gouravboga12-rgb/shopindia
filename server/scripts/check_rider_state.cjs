const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const riders = await prisma.riderProfile.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      payoutRequests: true,
      deliveries: {
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentMethod: true,
              total: true
            }
          }
        }
      },
      codRemittances: true,
      ledgerEntries: true
    }
  });

  for (const r of riders) {
    console.log('RIDER:', JSON.stringify({
      id: r.id,
      name: r.user?.name,
      walletBalance: r.walletBalance,
      codCashFloat: r.codCashFloat,
      totalDeliveries: r.totalDeliveries,
      payoutRequests: r.payoutRequests,
      deliveries: r.deliveries.map(d => ({
        id: d.id,
        orderId: d.orderId,
        orderNumber: d.order?.orderNumber,
        status: d.status,
        deliveryFee: d.deliveryFee,
        orderTotal: d.order?.total,
        paymentMethod: d.order?.paymentMethod
      })),
      codRemittances: r.codRemittances,
      ledgerEntries: r.ledgerEntries
    }, null, 2));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
