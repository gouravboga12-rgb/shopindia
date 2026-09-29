/**
 * Seed script — creates demo products across all 6 sub-verticals in PostgreSQL via Prisma.
 * Run: node server/scripts/seed-products.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const prisma = require('../lib/prisma');

const PRODUCTS = [
  // ── 1. Quick Commerce: Instant Grocery ──
  { name: 'Fresh Royal Gala Apples 1kg', brand: 'Farm Fresh', basePrice: 160, mrp: 199, stock: 200, category: 'Fruits & Veggies', img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.6, ratingCount: 820, tags: ['grocery', 'Fruits & Veggies'] },
  { name: 'Organic Robust Bananas 1 Dozen', brand: 'Farm Fresh', basePrice: 60, mrp: 80, stock: 300, category: 'Fruits & Veggies', img: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.4, ratingCount: 540, tags: ['grocery', 'Fruits & Veggies'] },
  { name: 'Amul Taaza Homogenised Milk 1L', brand: 'Amul', basePrice: 66, mrp: 72, stock: 500, category: 'Dairy, Bread & Eggs', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.8, ratingCount: 1300, tags: ['grocery', 'Dairy, Bread & Eggs'] },
  { name: 'Farm Fresh Country Eggs 12 Pack', brand: 'Farm Fresh', basePrice: 95, mrp: 110, stock: 250, category: 'Dairy, Bread & Eggs', img: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.5, ratingCount: 610, tags: ['grocery', 'Dairy, Bread & Eggs'] },
  { name: 'Lays Spanish Tomato Tango 52g', brand: 'Lays', basePrice: 20, mrp: 25, stock: 1000, category: 'Snacks & Munchies', img: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.3, ratingCount: 2200, tags: ['grocery', 'Snacks & Munchies'] },

  // ── 2. Quick Commerce: Food Delivery ──
  { name: 'Royal Hyderabadi Dum Biryani', brand: 'Behrouz Biryani', basePrice: 349, mrp: 399, stock: 100, category: 'Biryani & Rice', img: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.7, ratingCount: 940, tags: ['food', 'Biryani & Rice', 'Non-Veg'] },
  { name: 'Classic Farmhouse Veggie Pizza', brand: 'La Pinoz Pizza', basePrice: 289, mrp: 349, stock: 100, category: 'Pizza & Fast Food', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.5, ratingCount: 780, tags: ['food', 'Pizza & Fast Food', 'Veg'] },
  { name: 'Paneer Butter Masala with 2 Naan', brand: 'Punjab Grill', basePrice: 249, mrp: 299, stock: 120, category: 'Thalis & Curries', img: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.6, ratingCount: 520, tags: ['food', 'Thalis & Curries', 'Veg'] },
  { name: 'Warm Chocolate Lava Cake', brand: 'The Dessert House', basePrice: 119, mrp: 149, stock: 80, category: 'Desserts & Shakes', img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.8, ratingCount: 410, tags: ['food', 'Desserts & Shakes', 'Veg'] },

  // ── 3. Quick Commerce: Pharmacy Medicines ──
  { name: 'Dolo 650mg Paracetamol Tablets (15 Tabs)', brand: 'Micro Labs', basePrice: 32, mrp: 36, stock: 500, category: 'Fever & Pain Relief', img: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.9, ratingCount: 1500, tags: ['pharmacy', 'Fever & Pain Relief', 'rx'] },
  { name: 'Benadryl Cough & Cold Syrup (100ml)', brand: 'Johnson & Johnson', basePrice: 115, mrp: 130, stock: 300, category: 'Cough & Cold', img: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.7, ratingCount: 680, tags: ['pharmacy', 'Cough & Cold', 'rx'] },
  { name: 'Limcee Vitamin C 500mg Chewable (15 Tabs)', brand: 'Abbott', basePrice: 28, mrp: 32, stock: 450, category: 'Vitamins & Immunity', img: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.8, ratingCount: 1100, tags: ['pharmacy', 'Vitamins & Immunity'] },
  { name: 'Omron Digital Blood Pressure Monitor', brand: 'Omron', basePrice: 1899, mrp: 2490, stock: 40, category: 'First Aid & Care', img: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'quick_commerce', ratingAvg: 4.6, ratingCount: 320, tags: ['pharmacy', 'First Aid & Care'] },

  // ── 4. E-Commerce (Normal Shopping) ──
  { name: 'Samsung 1.5 Ton 5-Star Split Inverter AC', brand: 'Samsung', basePrice: 38490, mrp: 46990, stock: 25, category: 'Appliances', img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'traditional', ratingAvg: 4.7, ratingCount: 310, tags: ['Appliances', 'Air Conditioners'] },
  { name: 'Apple iPhone 15 Pro Max 256GB', brand: 'Apple', basePrice: 134900, mrp: 144900, stock: 15, category: 'Mobiles & Tablets', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'traditional', ratingAvg: 4.9, ratingCount: 1200, tags: ['Electronics', 'Mobiles'] },
  { name: "Levi's Classic Vintage Denim Jacket", brand: "Levi's", basePrice: 2499, mrp: 3999, stock: 80, category: 'Fashion & Apparel', img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'traditional', ratingAvg: 4.4, ratingCount: 440, tags: ['Fashion', 'Menswear'] },
  { name: 'Philips 750W 4-Jar Mixer Grinder', brand: 'Philips', basePrice: 3299, mrp: 4499, stock: 60, category: 'Appliances', img: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'traditional', ratingAvg: 4.5, ratingCount: 700, tags: ['Appliances', 'Kitchen'] },

  // ── 5. Services: Home Services ( Company Style) ──
  { name: 'AC Foam Jet Deep Cleaning & Service', brand: 'ShopIndia Home Care', basePrice: 599, mrp: 899, stock: 999, category: 'AC Repair & Service', img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.8, ratingCount: 890, tags: ['home_service', 'AC Repair & Service'] },
  { name: 'Complete 2BHK/3BHK Deep Home Cleaning', brand: 'ShopIndia Home Care', basePrice: 2199, mrp: 2999, stock: 999, category: 'Deep House Cleaning', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.7, ratingCount: 450, tags: ['home_service', 'Deep House Cleaning'] },
  { name: 'Expert Electrician Consultation & Repair', brand: 'ShopIndia Home Care', basePrice: 199, mrp: 299, stock: 999, category: 'Electrician & Plumber', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.6, ratingCount: 620, tags: ['home_service', 'Electrician & Plumber'] },
  { name: 'Salon Hair Spa & Facial at Home', brand: 'ShopIndia Grooming', basePrice: 899, mrp: 1299, stock: 999, category: 'Salon & Grooming at Home', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.9, ratingCount: 310, tags: ['home_service', 'Salon & Grooming at Home'] },

  // ── 6. Services: Vehicle Services (Technician Marketplace) ──
  { name: 'Comprehensive Periodic Car Service & Inspection', brand: 'ShopIndia AutoTech', basePrice: 2499, mrp: 3499, stock: 999, category: 'Periodic Car/Bike Service', img: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.8, ratingCount: 520, tags: ['vehicle_service', 'Periodic Car/Bike Service', 'car'] },
  { name: 'Doorstep High-Pressure Foam Car Spa & Wax', brand: 'ShopIndia AutoTech', basePrice: 499, mrp: 799, stock: 999, category: 'Doorstep Foam Wash & Spa', img: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.7, ratingCount: 410, tags: ['vehicle_service', 'Doorstep Foam Wash & Spa', 'car'] },
  { name: '24x7 Emergency Roadside Assistance & Flatbed Towing', brand: 'ShopIndia RoadRescue', basePrice: 1299, mrp: 1799, stock: 999, category: 'Emergency Roadside Towing (24x7)', img: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.9, ratingCount: 880, tags: ['vehicle_service', 'Emergency Roadside Towing (24x7)', 'towing'] },
  { name: 'On-Spot Car/Bike Battery Jumpstart & Health Check', brand: 'ShopIndia AutoTech', basePrice: 349, mrp: 499, stock: 999, category: 'Battery Jumpstart & Check', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop&q=60', fulfillmentType: 'hvac_service', ratingAvg: 4.8, ratingCount: 340, tags: ['vehicle_service', 'Battery Jumpstart & Check'] },
];

async function getOrCreateVendor() {
  const vendorUser = await prisma.user.findUnique({ where: { email: 'vendor@demo.in' } });
  if (vendorUser && vendorUser.vendorId) {
    return prisma.vendor.findUnique({ where: { id: vendorUser.vendorId } });
  }

  const hashedPassword = await require('bcryptjs').hash('Vendor@1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'vendor@demo.in' },
    update: {},
    create: {
      name: 'ShopIndia Verified Partner',
      email: 'vendor@demo.in',
      phone: '8888888888',
      password: hashedPassword,
      role: 'vendor',
    },
  });

  const vendor = await prisma.vendor.create({
    data: {
      userId: user.id,
      businessName: 'ShopIndia Unified Multi-Vertical Store',
      contactName: 'ShopIndia Partner Network',
      email: 'vendor@demo.in',
      phone: '8888888888',
      gstNumber: '29ABCDE1234F1Z5',
      approvalStatus: 'approved',
      commissionRate: 10,
      walletBalance: 0,
      category: 'Multi-Vertical Marketplace',
      description: 'Unified multi-vendor catalog covering E-Commerce, Quick Commerce, and Services.',
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { vendorId: vendor.id } });
  return vendor;
}

async function seed() {
  console.log('✅ Connecting to PostgreSQL via Prisma...');

  const vendor = await getOrCreateVendor();
  console.log(`  Using vendor: ${vendor.businessName}`);

  // Upsert categories first
  const categoryMap = new Map();
  for (const p of PRODUCTS) {
    if (!p.category) continue;
    let vertical = 'shop';
    if (p.fulfillmentType === 'quick_commerce') vertical = 'quick';
    else if (p.fulfillmentType === 'hvac' || p.fulfillmentType === 'hvac_service') vertical = 'services';

    const slug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let cat = await prisma.category.findFirst({ where: { name: p.category, vertical } });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: p.category,
          slug,
          vertical,
          image: p.img || null,
          isActive: true,
        },
      });
      console.log(`  + Category: ${p.category} (${vertical})`);
    }
    categoryMap.set(p.category, cat.id);
  }

  // Upsert products and assign categoryId
  for (const p of PRODUCTS) {
    const categoryId = categoryMap.get(p.category) || null;
    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          categoryId,
          basePrice: p.basePrice,
          mrp: p.mrp,
          tags: p.tags,
          fulfillmentType: p.fulfillmentType,
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
        },
      });
      console.log(`  ~ Updated: ${p.name} (Category: ${p.category})`);
    } else {
      await prisma.product.create({
        data: {
          vendorId: vendor.id,
          categoryId,
          name: p.name,
          description: `${p.brand} — official on ShopIndia. Authentic and verified quality with fast doorstep delivery.`,
          brand: p.brand,
          basePrice: p.basePrice,
          mrp: p.mrp,
          stock: p.stock,
          unit: 'piece',
          isOutOfStock: false,
          fulfillmentType: p.fulfillmentType,
          status: 'active',
          ratingAvg: p.ratingAvg,
          ratingCount: p.ratingCount,
          tags: p.tags,
          images: { create: [{ url: p.img, displayOrder: 0 }] },
        },
      });
      console.log(`  + Created: ${p.name} (Category: ${p.category})`);
    }
  }

  await prisma.$disconnect();
  console.log('✅ Multi-Vertical catalog seeding complete.');
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
