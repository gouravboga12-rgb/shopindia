'use strict';
/**
 * server/routes/products.js
 * Public Storefront Products Catalog.
 * Implements hyper-local quick-commerce radius filtering while keeping Pan-India products nationwide.
 */

const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** GET /api/products — public storefront catalog */
router.get('/', async (req, res) => {
  try {
    const { lat, lng, city, pincode, vertical: requestedVertical } = req.query;

    const customerLat = lat !== undefined && lat !== '' ? parseFloat(lat) : null;
    const customerLng = lng !== undefined && lng !== '' ? parseFloat(lng) : null;
    const customerCity = city ? String(city).trim().toLowerCase() : null;
    const customerPincode = pincode ? String(pincode).trim() : null;

    const products = await prisma.product.findMany({
      where: { status: 'active' },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        vendor: {
          select: {
            id: true,
            businessName: true,
            category: true,
            city: true,
            pincode: true,
            lat: true,
            lng: true,
            deliveryRadiusKm: true,
            supportsQuick: true,
            isActive: true,
          },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = [];

    for (const p of products) {
      const vertical = mapVertical(p.fulfillmentType);
      const subVertical = mapSubVertical(
        p.fulfillmentType,
        p.category?.name || p.categoryId,
        p.tags,
        p.name
      );

      // Filter by requested vertical if query specified
      if (requestedVertical && vertical !== requestedVertical) {
        continue;
      }

      let distanceKm = null;

      // ─── Hyper-Local Filtering for Quick Commerce ──────────────────────────
      if (p.fulfillmentType === 'quick_commerce') {
        // If vendor explicitly turned off quick orders or is inactive, exclude
        if (p.vendor && (p.vendor.isActive === false || p.vendor.supportsQuick === false)) {
          continue;
        }

        const maxRadius = p.vendor?.deliveryRadiusKm || 5;

        if (customerLat !== null && customerLng !== null && !isNaN(customerLat) && !isNaN(customerLng)) {
          if (p.vendor?.lat != null && p.vendor?.lng != null) {
            const dist = haversineDistanceKm(customerLat, customerLng, p.vendor.lat, p.vendor.lng);
            if (dist > maxRadius) {
              // Beyond vendor's delivery radius -> exclude from quick catalog
              continue;
            }
            distanceKm = Math.round(dist * 10) / 10;
          } else if (customerCity && p.vendor?.city) {
            // Fallback: If vendor doesn't have lat/lng yet, match city
            const vendorCity = p.vendor.city.toLowerCase();
            if (!vendorCity.includes(customerCity) && !customerCity.includes(vendorCity)) {
              continue;
            }
          }
        } else if (customerCity || customerPincode) {
          // No GPS provided, but city or pincode provided
          let matched = false;
          if (customerCity && p.vendor?.city) {
            const vCity = p.vendor.city.toLowerCase();
            if (vCity.includes(customerCity) || customerCity.includes(vCity)) matched = true;
          }
          if (customerPincode && p.vendor?.pincode && p.vendor.pincode === customerPincode) {
            matched = true;
          }
          if (!matched && (p.vendor?.city || p.vendor?.pincode)) {
            continue;
          }
        }
      }
      // Traditional products (Shop / Pan-India) remain universally visible across India!

      // Determine clean category display name
      let resolvedCategory = p.category?.name || '';
      if (!resolvedCategory && p.tags && p.tags.length) {
        const genericTags = new Set([
          'food', 'grocery', 'pharmacy', 'home_service', 'vehicle_service',
          'retail', 'veg', 'non-veg', 'rx', 'car', 'bike', 'both',
        ]);
        const specificTag = p.tags.find((t) => !genericTags.has(t.toLowerCase()));
        if (specificTag) resolvedCategory = specificTag;
        else resolvedCategory = p.tags[0];
      }
      if (!resolvedCategory && p.vendor?.category) resolvedCategory = p.vendor.category;

      mapped.push({
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
        // Hyper-local vendor metadata
        vendor: {
          id: p.vendor?.id,
          name: p.vendor?.businessName,
          city: p.vendor?.city,
          pincode: p.vendor?.pincode,
          lat: p.vendor?.lat,
          lng: p.vendor?.lng,
          deliveryRadiusKm: p.vendor?.deliveryRadiusKm || 5,
          distanceKm: distanceKm != null ? distanceKm : undefined,
        },
        // Specific metadata inferred or default
        isVeg:
          p.tags?.some((t) => t.toLowerCase().includes('veg')) ||
          !p.tags?.some((t) => t.toLowerCase().includes('non-veg')),
        prepTime:
          subVertical === 'food'
            ? '20-30 min'
            : vertical === 'quick'
            ? '10-15 min'
            : '2-4 days',
        restaurantName: subVertical === 'food' ? p.brand || 'ShopIndia Cloud Kitchen' : undefined,
        cuisine: subVertical === 'food' ? p.tags?.[0] || 'Indian & Continental' : undefined,
        requiresPrescription:
          subVertical === 'pharmacy' &&
          (p.tags?.some((t) => t.toLowerCase().includes('rx')) ||
            p.name.toLowerCase().includes('tablet') ||
            p.name.toLowerCase().includes('capsule')),
        dosageForm: subVertical === 'pharmacy' ? (p.name.includes('Syrup') ? 'Syrup' : 'Tablet / Capsule') : undefined,
        packSize: subVertical === 'pharmacy' ? '10 Units / Strip' : undefined,
        serviceType: subVertical === 'vehicle_service' ? 'vehicle' : vertical === 'services' ? 'home' : undefined,
        serviceSlots:
          p.serviceSlots && p.serviceSlots.length > 0
            ? p.serviceSlots
            : vertical === 'services'
            ? ['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM']
            : [],
        durationEstimate: p.durationEstimate || (vertical === 'services' ? '45 - 90 mins' : undefined),
        warrantyDays: vertical === 'services' ? 30 : undefined,
        vehicleType: subVertical === 'vehicle_service' ? 'both' : undefined,
        serviceLocationType: subVertical === 'vehicle_service' ? 'both' : undefined,
      });
    }

    res.json(mapped);
  } catch (err) {
    console.error('[Products] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

function mapVertical(fulfillmentType) {
  switch (fulfillmentType) {
    case 'quick_commerce':
      return 'quick';
    case 'hvac':
    case 'hvac_service':
      return 'services';
    default:
      return 'shop';
  }
}

function mapSubVertical(fulfillmentType, categoryId, tags, name) {
  const text = `${categoryId || ''} ${(tags || []).join(' ')} ${name || ''}`.toLowerCase();

  if (fulfillmentType === 'quick_commerce') {
    if (
      text.includes('pharma') ||
      text.includes('medicine') ||
      text.includes('tablet') ||
      text.includes('capsule') ||
      text.includes('syrup') ||
      text.includes('first aid')
    ) {
      return 'pharmacy';
    }
    if (
      text.includes('food') ||
      text.includes('biryani') ||
      text.includes('pizza') ||
      text.includes('burger') ||
      text.includes('meal') ||
      text.includes('paneer butter') ||
      text.includes('kitchen') ||
      text.includes('roll')
    ) {
      return 'food';
    }
    return 'grocery';
  }

  if (fulfillmentType === 'hvac' || fulfillmentType === 'hvac_service') {
    if (
      text.includes('car') ||
      text.includes('bike') ||
      text.includes('vehicle') ||
      text.includes('mechanic') ||
      text.includes('towing') ||
      text.includes('battery jump') ||
      text.includes('wheel')
    ) {
      return 'vehicle_service';
    }
    return 'home_service';
  }

  return 'fashion';
}

module.exports = router;