const prisma = require('./lib/prisma');

async function run() {
  const vendors = await prisma.vendor.findMany({
    take: 5,
    include: {
      user: { select: { email: true, name: true, phone: true } },
      products: {
        take: 3,
        select: { id: true, name: true, basePrice: true, fulfillmentType: true, stock: true }
      }
    }
  });

  console.log('=== VENDORS & PRODUCTS ===');
  for (const v of vendors) {
    console.log(`\nVendor: "${v.businessName}" (ID: ${v.id})`);
    console.log(`  Owner: ${v.user?.name} | Email: ${v.user?.email} | Status: ${v.status}`);
    console.log(`  Location: Lat ${v.latitude}, Lng ${v.longitude}, Address: ${v.address || v.city}`);
    console.log(`  Products (${v.products.length}):`);
    v.products.forEach(p => {
      console.log(`    - [${p.id}] ${p.name} - ₹${p.basePrice} (Fulfillment: ${p.fulfillmentType}, Stock: ${p.stock})`);
    });
  }

  const customers = await prisma.user.findMany({
    where: { role: 'customer' },
    take: 3,
    select: { id: true, name: true, email: true, phone: true }
  });
  console.log('\n=== CUSTOMERS ===');
  customers.forEach(c => console.log(`  Customer: ${c.name} | Email: ${c.email} | Phone: ${c.phone}`));

  const rider = await prisma.riderProfile.findFirst({
    where: { user: { email: 'bogagourav69@gmail.com' } },
    include: { user: { select: { email: true, name: true } } }
  });
  console.log('\n=== RIDER ===');
  console.log(`  Rider: ${rider?.user?.name} | Email: ${rider?.user?.email} | Online: ${rider?.isOnline} | Lat: ${rider?.currentLat}, Lng: ${rider?.currentLng}`);
}

run().finally(() => prisma.$disconnect());
