const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const vendors = await prisma.vendor.findMany({
    take: 5,
    include: {
      user: { select: { email: true, name: true, phone: true } },
      products: {
        where: { isQuickCommerce: true, inStock: true },
        select: { id: true, name: true, price: true, isQuickCommerce: true }
      }
    }
  });

  console.log('--- VENDORS ---');
  for (const v of vendors) {
    console.log(`Vendor: ${v.businessName} | Email: ${v.user?.email} | Status: ${v.status} | QC Products: ${v.products.length}`);
    if (v.products.length > 0) {
      console.log('  Products:', v.products.map(p => `${p.name} (₹${p.price})`).join(', '));
    }
  }

  const rider = await prisma.riderProfile.findFirst({
    where: { user: { email: 'bogagourav69@gmail.com' } },
    include: { user: { select: { email: true, name: true, phone: true } } }
  });
  console.log('\n--- RIDER ---');
  console.log(`Rider: ${rider?.user?.name} | Email: ${rider?.user?.email} | Online: ${rider?.isOnline} | Approved: ${rider?.isApproved} | Float: ${rider?.codCashFloat}`);

  const customer = await prisma.user.findFirst({
    where: { role: 'customer' },
    select: { id: true, name: true, email: true, phone: true }
  });
  console.log('\n--- CUSTOMER ---');
  console.log(`Customer: ${customer?.name} | Email: ${customer?.email} | Phone: ${customer?.phone}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
