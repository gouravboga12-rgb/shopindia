const prisma = require('./lib/prisma');

async function createOrder() {
  const customer = await prisma.user.findUnique({
    where: { email: 'demouser@gmail.com' },
  });

  const vendor = await prisma.vendor.findUnique({
    where: { id: 'dc47b691-0518-41a6-9b7a-dbd129ad60b9' },
  });

  const product = await prisma.product.findFirst({
    where: { vendorId: vendor.id, fulfillmentType: 'quick_commerce' },
  });

  if (!customer || !vendor || !product) {
    console.error('Missing customer, vendor, or product', { customer: !!customer, vendor: !!vendor, product: !!product });
    return;
  }

  const orderNumber = 'ORD-QC-' + Date.now().toString().slice(-6);
  const total = Number(product.basePrice) || 160;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: customer.id,
      vendorId: vendor.id,
      status: 'placed',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      total,
      type: 'quick_commerce',
      deliveryLine1: 'Flat 402, Sai Residency, Dilsukhnagar',
      deliveryCity: 'Hyderabad',
      deliveryState: 'Telangana',
      deliveryPincode: '500060',
      items: {
        create: [
          {
            productId: product.id,
            name: product.name,
            price: total,
            quantity: 1,
          },
        ],
      },
    },
    include: { items: true, vendor: true, customer: true },
  });

  console.log(`✅ Test Quick-Commerce Order Created Successfully!`);
  console.log(`Order ID: ${order.id}`);
  console.log(`Order Number: #${order.orderNumber}`);
  console.log(`Product: ${product.name}`);
  console.log(`Total: ₹${order.total}`);
  console.log(`Vendor: ${order.vendor?.businessName}`);
  console.log(`Status: ${order.status}`);
}

createOrder().finally(() => prisma.$disconnect());
