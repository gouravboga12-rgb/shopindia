const express = require('express');
const https = require('https');
const prisma = require('../lib/prisma');
const { getDeliveryLocation } = require('../lib/socket');

const router = express.Router();

/**
 * Helper to perform HTTPS GET and parse JSON with a timeout
 */
function fetchJson(url, options = {}, timeoutMs = 4000) {
  return new Promise((resolve) => {
    let resolved = false;
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (resolved) return;
        resolved = true;
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      if (resolved) return;
      resolved = true;
      resolve(null);
    });

    req.setTimeout(timeoutMs, () => {
      if (resolved) return;
      resolved = true;
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * GET /api/tracking/reverse-geocode?lat=...&lng=...
 * Reverse geocodes GPS coordinates into detailed structured address components:
 * Road / House No, Colony / Village, Mandal, District / City, State, Pincode, and Country.
 * Uses Mapbox Geocoding API with OpenStreetMap Nominatim enrichment.
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
    }

    const token = process.env.MAPBOX_ACCESS_TOKEN;
    const mapboxUrl = token ? `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&country=in` : null;
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;

    const [mapboxData, nominatimData] = await Promise.all([
      mapboxUrl ? fetchJson(mapboxUrl) : Promise.resolve(null),
      fetchJson(nominatimUrl, { headers: { 'User-Agent': 'ShopIndia-QuickCommerce/1.0' } }),
    ]);


    const nomAddr = nominatimData?.address || {};
    const mbFeat = mapboxData?.features?.[0] || {};
    const mbCtx = mbFeat.context || [];
    const getMb = (prefix) => mbCtx.find((c) => c.id.startsWith(prefix))?.text;

    const pincode = nomAddr.postcode || getMb('postcode') || '';
    const rawRoad = [nomAddr.house_number, nomAddr.road].filter(Boolean).join(' ') || (mbFeat.text && mbFeat.text !== pincode ? mbFeat.text : '');
    const road = (rawRoad === pincode) ? '' : rawRoad;

    const colony = nomAddr.suburb || nomAddr.neighbourhood || nomAddr.village || nomAddr.hamlet || nomAddr.residential || getMb('neighborhood') || getMb('locality') || '';
    const village = nomAddr.village || nomAddr.hamlet || '';
    const mandal = nomAddr.county || nomAddr.subdistrict || nomAddr.tehsil || nomAddr.municipality || getMb('locality') || '';
    const city = nomAddr.city || nomAddr.town || nomAddr.municipality || getMb('place') || '';
    const district = nomAddr.state_district || nomAddr.district || getMb('district') || city;
    const state = nomAddr.state || getMb('region') || '';
    const country = nomAddr.country || getMb('country') || 'India';

    // Build structured formatted string: Road, Colony/Village, Mandal, District/City, State - Pincode, Country
    const parts = [];
    if (road) parts.push(road);
    if (colony && !parts.includes(colony)) parts.push(colony);
    if (mandal && !parts.includes(mandal) && mandal !== colony) parts.push(mandal);
    if (district && !parts.includes(district) && district !== city) {
      if (city && !parts.includes(city)) {
        parts.push(`${district}, ${city}`);
      } else {
        parts.push(district);
      }
    } else if (city && !parts.includes(city)) {
      parts.push(city);
    }
    if (state) {
      parts.push(pincode ? `${state} - ${pincode}` : state);
    } else if (pincode) {
      parts.push(pincode);
    }
    if (country && !parts.includes(country)) parts.push(country);

    const fullAddress = parts.length > 0 ? parts.join(', ') : (mbFeat?.place_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);

    res.json({
      success: true,
      latitude: lat,
      longitude: lng,
      road,
      colony,
      village,
      mandal,
      city,
      district,
      state,
      pincode,
      country,
      fullAddress,
      formattedAddress: fullAddress,
    });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.status(500).json({ error: err.message || 'Failed to reverse geocode coordinates.' });
  }
});

/**
 * GET /api/tracking/order/:orderId
 * Fetches real-time delivery status, route coordinates, and assigned rider for a customer/vendor order
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            type: true,
            total: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                phone: true,
                street: true,
                city: true,
                state: true,
                pincode: true,
              },
            },
          },
        },
        riderProfile: {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            rating: true,
            currentLat: true,
            currentLng: true,
            user: {
              select: {
                name: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({ error: 'No quick delivery record found for this order.' });
    }

    // Get live in-memory location ping if actively streaming, or fallback to rider profile coords
    const livePing = getDeliveryLocation(delivery.id);
    const lastLat = livePing?.lat ?? delivery.riderProfile?.currentLat ?? delivery.pickupLat ?? 17.4486;
    const lastLng = livePing?.lng ?? delivery.riderProfile?.currentLng ?? delivery.pickupLng ?? 78.3850;

    res.json({
      success: true,
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      orderNumber: delivery.order?.orderNumber,
      status: delivery.status,
      distanceKm: delivery.distanceKm,
      deliveryOtp: delivery.deliveryOtp, // Shown to customer for verification
      pickup: {
        name: delivery.pickupName,
        address: delivery.pickupAddress,
        phone: delivery.pickupPhone,
        lat: delivery.pickupLat || 17.4486,
        lng: delivery.pickupLng || 78.3850,
      },
      dropoff: {
        name: delivery.dropoffName,
        address: delivery.dropoffAddress,
        phone: delivery.dropoffPhone,
        lat: delivery.dropoffLat || 17.4375,
        lng: delivery.dropoffLng || 78.3650,
      },
      rider: delivery.riderProfile ? {
        id: delivery.riderProfile.id,
        name: delivery.riderProfile.user?.name || 'Assigned Partner',
        phone: delivery.riderProfile.user?.phone || '',
        avatar: delivery.riderProfile.user?.avatar,
        vehicleType: delivery.riderProfile.vehicleType,
        vehicleNumber: delivery.riderProfile.vehicleNumber,
        rating: delivery.riderProfile.rating || 5.0,
      } : null,
      currentLocation: {
        lat: lastLat,
        lng: lastLng,
        bearing: livePing?.bearing || 0,
        speed: livePing?.speed || 0,
        updatedAt: livePing?.updatedAt || new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Order tracking fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
