const prisma = require('./lib/prisma');
const bcrypt = require('bcryptjs');

async function run() {
  const hash = await bcrypt.hash('123456', 10);

  // Set known password '123456' for vendor@demo.in and demouser@gmail.com
  await prisma.user.updateMany({
    where: { email: { in: ['vendor@demo.in', 'demouser@gmail.com'] } },
    data: { password: hash }
  });

  console.log('Vendor & Customer passwords set to 123456');

  // Set vendor location near rider for instant matching
  const rider = await prisma.riderProfile.findFirst({
    where: { user: { email: 'bogagourav69@gmail.com' } },
  });

  const rLat = rider?.currentLat || 17.3732;
  const rLng = rider?.currentLng || 78.5385;

  await prisma.vendor.update({
    where: { id: 'dc47b691-0518-41a6-9b7a-dbd129ad60b9' },
    data: {
      lat: rLat + 0.005,
      lng: rLng + 0.005,
      street: 'ShopIndia Hub, Dilsukhnagar, Hyderabad',
      city: 'Hyderabad',
      deliveryRadiusKm: 25,
      supportsQuick: true,
      isActive: true,
    }
  });

  console.log('Vendor location synchronized within 1km of rider for dispatch matching!');
}

run().finally(() => prisma.$disconnect());
