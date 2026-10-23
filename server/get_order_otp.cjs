const prisma = require('./lib/prisma');

async function run() {
  const delivery = await prisma.delivery.findFirst({
    where: { order: { orderNumber: 'ORD-QC-485522' } },
    include: { order: true }
  });
  console.log('DELIVERY_ID:', delivery ? delivery.id : 'none');
  console.log('DELIVERY_STATUS:', delivery ? delivery.status : 'none');
  console.log('DELIVERY_OTP:', delivery ? delivery.deliveryOtp : 'none');
  console.log('DELIVERY_FEE:', delivery ? delivery.deliveryFee : 'none');
}

run().finally(() => prisma.$disconnect());
