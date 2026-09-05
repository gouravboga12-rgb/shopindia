const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

/** GET /api/products — public storefront catalog */
router.get('/', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        vendor: { select: { businessName: true, category: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products.map((p) => {
      const vertical = mapVertical(p.fulfillmentType);
      const subVertical = mapSubVertical(p.fulfillmentType, p.category?.name || p.categoryId, p.tags, p.name);
      
      // Determine clean category display name
      let resolvedCategory = p.category?.name || '';
      if (!resolvedCategory && p.tags && p.tags.length) {
        // Skip generic vertical tags like 'food', 'grocery', 'pharmacy', 'home_service', 'vehicle_service', 'retail', 'Veg', 'Non-Veg', 'rx', 'car', 'bike'
        const genericTags = new Set(['food', 'grocery', 'pharmacy', 'home_service', 'vehicle_service', 'retail', 'veg', 'non-veg', 'rx', 'car', 'bike', 'both']);
        const specificTag = p.tags.find(t => !genericTags.has(t.toLowerCase()));
        if (specificTag) resolvedCategory = specificTag;
        else resolvedCategory = p.tags[0];
      }
      if (!resolvedCategory && p.vendor?.category) resolvedCategory = p.vendor.category;

      return {
        id: p.id,
        title: p.name,
        description: p.description || '',
        price: p.basePrice,
        originalPrice: p.mrp || p.basePrice,
        rating: p.ratingAvg,
        ratingCount: p.ratingCount,
        image: p.images && p.images.length ? p.images[0].url : '',
        category: resolvedCategory,
        brand: p.brand || '',
        vertical,
        subVertical,
        stock: p.stock,
        isOutOfStock: p.isOutOfStock || p.stock <= 0,
        isAssured: true,
        // Specific metadata inferred or default
        isVeg: p.tags?.some(t => t.toLowerCase().includes('veg')) || !p.tags?.some(t => t.toLowerCase().includes('non-veg')),
        prepTime: subVertical === 'food' ? '20-30 min' : (vertical === 'quick' ? '10-15 min' : '2-4 days'),
        restaurantName: subVertical === 'food' ? (p.brand || 'ShopIndia Cloud Kitchen') : undefined,
        cuisine: subVertical === 'food' ? (p.tags?.[0] || 'Indian & Continental') : undefined,
        requiresPrescription: subVertical === 'pharmacy' && (p.tags?.some(t => t.toLowerCase().includes('rx')) || p.name.toLowerCase().includes('tablet') || p.name.toLowerCase().includes('capsule')),
        dosageForm: subVertical === 'pharmacy' ? (p.name.includes('Syrup') ? 'Syrup' : 'Tablet / Capsule') : undefined,
        packSize: subVertical === 'pharmacy' ? '10 Units / Strip' : undefined,
        serviceType: subVertical === 'vehicle_service' ? 'vehicle' : (vertical === 'services' ? 'home' : undefined),
        serviceSlots: p.serviceSlots && p.serviceSlots.length > 0
          ? p.serviceSlots
          : (vertical === 'services' ? ['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM'] : []),
        durationEstimate: p.durationEstimate || (vertical === 'services' ? '45 - 90 mins' : undefined),
        warrantyDays: vertical === 'services' ? 30 : undefined,
        vehicleType: subVertical === 'vehicle_service' ? 'both' : undefined,
        serviceLocationType: subVertical === 'vehicle_service' ? 'both' : undefined,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapVertical(fulfillmentType) {
  switch (fulfillmentType) {
    case 'quick_commerce': return 'quick';
    case 'hvac':
    case 'hvac_service': return 'services';
    default: return 'shop';
  }
}

function mapSubVertical(fulfillmentType, categoryId, tags, name) {
  const text = `${categoryId || ''} ${(tags || []).join(' ')} ${name || ''}`.toLowerCase();
  
  if (fulfillmentType === 'quick_commerce') {
    if (text.includes('pharma') || text.includes('medicine') || text.includes('tablet') || text.includes('capsule') || text.includes('syrup') || text.includes('first aid')) {
      return 'pharmacy';
    }
    if (text.includes('food') || text.includes('biryani') || text.includes('pizza') || text.includes('burger') || text.includes('meal') || text.includes('paneer butter') || text.includes('kitchen') || text.includes('roll')) {
      return 'food';
    }
    return 'grocery';
  }

  if (fulfillmentType === 'hvac' || fulfillmentType === 'hvac_service') {
    if (text.includes('car') || text.includes('bike') || text.includes('vehicle') || text.includes('mechanic') || text.includes('towing') || text.includes('battery jump') || text.includes('wheel')) {
      return 'vehicle_service';
    }
    return 'home_service';
  }

  return 'normal_shop';
}

module.exports = router;