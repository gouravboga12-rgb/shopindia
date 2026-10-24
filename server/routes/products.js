'use strict';
/**
 * server/routes/products.js
 * Public Storefront Products Catalog.
 * Implements:
 * 1. Hyper-local quick-commerce radius filtering (5km - 100km slider) with dynamic prepTime
 * 2. Glacons real-time technician & skill radius checking with demand capture
 * 3. Pan-India traditional e-commerce nationwide catalog (exempt from distance checks)
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

/**
 * Normalizes service categories/tags into canonical technician skill tags
 */
function getServiceSkillTag(category, tags, name) {
  const text = `${category || ''} ${(tags || []).join(' ')} ${name || ''}`.toLowerCase();
  if (text.includes('ac ') || text.includes('air condition') || text.includes('hvac')) return 'ac_service';
  if (text.includes('electric') || text.includes('wiring') || text.includes('switch') || text.includes('fan')) return 'electrician';
  if (text.includes('plumb') || text.includes('pipe') || text.includes('tap') || text.includes('leak') || text.includes('geyser')) return 'plumbing';
  if (text.includes('clean') || text.includes('sanitize') || text.includes('wash') || text.includes('pest')) return 'cleaning';
  if (text.includes('salon') || text.includes('groom') || text.includes('spa') || text.includes('facial') || text.includes('haircut')) return 'salon';
  if (text.includes('car') || text.includes('bike') || text.includes('vehicle') || text.includes('mechanic') || text.includes('towing') || text.includes('battery')) return 'vehicle_service';
  if (text.includes('paint')) return 'painting';
  if (text.includes('carpent')) return 'carpentry';
  return 'general_service';
}

/** GET /api/products — public storefront catalog */
router.get('/', async (req, res) => {
  try {
    const { lat, lng, city, pincode, vertical: requestedVertical } = req.query;

    const customerLat = lat !== undefined && lat !== '' && !isNaN(parseFloat(lat)) ? parseFloat(lat) : null;
    const customerLng = lng !== undefined && lng !== '' && !isNaN(parseFloat(lng)) ? parseFloat(lng) : null;
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

    // If query could involve Glacons services, fetch active, approved technicians
    let technicians = [];
    if (!requestedVertical || requestedVertical === 'services') {
      try {
        technicians = await prisma.riderProfile.findMany({
          where: {
            isActive: true,
            isApproved: true,
            partnerType: { in: ['service', 'both'] },
          },
          select: {
            id: true,
            currentLat: true,
            currentLng: true,
            address: true,
            serviceRadiusKm: true,
            skills: true,
            isOnline: true,
          },
        });
      } catch (techErr) {
        console.warn('[Products] Technician query warning:', techErr.message);
      }
    }

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

        const maxRadius = p.vendor?.deliveryRadiusKm || 25;

        if (customerLat !== null && customerLng !== null) {
          if (p.vendor?.lat != null && p.vendor?.lng != null) {
            const dist = haversineDistanceKm(customerLat, customerLng, p.vendor.lat, p.vendor.lng);
            if (dist > maxRadius) {
              // Beyond vendor's delivery radius -> exclude from quick catalog
              continue;
            }
            distanceKm = Math.round(dist * 10) / 10;
          } else if (customerCity && p.vendor?.city) {
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

      // ─── Glacons Doorstep Services Technician Availability ─────────────────
      let isServiceAvailable = true;
      let nearbyTechniciansCount = 0;

      if (vertical === 'services') {
        const requiredSkill = getServiceSkillTag(p.category?.name, p.tags, p.name);

        if ((customerLat !== null && customerLng !== null) || customerCity || customerPincode) {
          const matchingTechnicians = technicians.filter((tech) => {
            // Check skill coverage
            const hasSkill =
              !tech.skills ||
              tech.skills.length === 0 ||
              tech.skills.some((s) => {
                const sl = s.toLowerCase();
                return sl.includes(requiredSkill) || requiredSkill.includes(sl) || sl === 'all';
              });
            if (!hasSkill) return false;

            // Check geographical radius coverage
            if (customerLat !== null && customerLng !== null && tech.currentLat != null && tech.currentLng != null) {
              const techDist = haversineDistanceKm(customerLat, customerLng, tech.currentLat, tech.currentLng);
              const techRadius = tech.serviceRadiusKm || 25;
              return techDist <= techRadius;
            }

            // Fallback: match address/city string
            if (customerCity && tech.address) {
              return tech.address.toLowerCase().includes(customerCity);
            }

            return false;
          });

          nearbyTechniciansCount = matchingTechnicians.length;
          isServiceAvailable = matchingTechnicians.length > 0;
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

      // Dynamic preparation / delivery time estimate based on distance
      let prepTime = '10-15 min';
      if (vertical === 'quick') {
        if (distanceKm != null) {
          if (distanceKm <= 5) prepTime = '10-15 min';
          else if (distanceKm <= 15) prepTime = '25-35 min';
          else if (distanceKm <= 50) prepTime = '45-60 min';
          else prepTime = 'Same-Day Express';
        } else {
          prepTime = subVertical === 'food' ? '20-30 min' : '10-15 min';
        }
      } else if (vertical === 'services') {
        prepTime = isServiceAvailable ? 'Arrives in 45 min' : 'Currently Unavailable';
      } else {
        prepTime = '2-4 days';
      }

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
          deliveryRadiusKm: p.vendor?.deliveryRadiusKm || 25,
          distanceKm: distanceKm != null ? distanceKm : undefined,
        },
        distanceKm: distanceKm != null ? distanceKm : undefined,
        isServiceAvailable: vertical === 'services' ? isServiceAvailable : undefined,
        nearbyTechniciansCount: vertical === 'services' ? nearbyTechniciansCount : undefined,
        // Specific metadata inferred or default
        isVeg:
          p.tags?.some((t) => t.toLowerCase().includes('veg')) ||
          !p.tags?.some((t) => t.toLowerCase().includes('non-veg')),
        prepTime,
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

/**
 * POST /api/products/demand-lead
 * Captures demand for unserved localities when customer taps "Notify Me When Available"
 */
router.post('/demand-lead', async (req, res) => {
  try {
    const { userId, phone, category, serviceName, pincode, city, lat, lng } = req.body;

    if (!serviceName) {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const lead = await prisma.serviceDemandLead.create({
      data: {
        userId: userId || null,
        phone: phone || null,
        category: category || 'general_service',
        serviceName,
        pincode: pincode ? String(pincode).trim() : null,
        city: city ? String(city).trim() : null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        status: 'pending',
      },
    });

    res.status(201).json({ success: true, lead });
  } catch (err) {
    console.error('[DemandLead] Error saving lead:', err);
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