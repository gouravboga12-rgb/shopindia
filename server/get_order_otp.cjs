const prisma = require('./lib/prisma');

async function run() {
  const delivery = await prisma.delivery.findFirst({
    where: { order: { orderNumber: 'ORD-QC-485522' } },
    include: { order: true }
  });
  console.log('DELIVERY_ID:', delivery ? delivery.id : 'none');
  console.log('DELIVERY_STATUS:', delivery ? delivery.status : 'none');
  console.log('DELIVERY_OTP:', delivery ? delivery.deliveryOtp : 'none');
  const rider = await prisma.riderProfile.findFirst({
    where: { user: { email: 'bogagourav69@gmail.com' } },
    include: { user: true }
  });
  console.log('RIDER_WALLET:', rider ? rider.walletBalance : 'none');
  console.log('RIDER_COD_FLOAT:', rider ? rider.codCashFloat : 'none');
  console.log('RIDER_TOTAL_DELIVERIES:', rider ? rider.totalDeliveries : 'none');
}

run().finally(() => prisma.$disconnect());
