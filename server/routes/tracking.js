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

    // 1. Precise extraction of all hierarchical Indian address components
    const houseNumber = mbFeat.address || nomAddr.house_number || '';
    const rawRoad = nomAddr.road || (mbFeat.text && mbFeat.text !== nomAddr.postcode && mbFeat.text !== houseNumber ? mbFeat.text : '');
    const road = rawRoad.replace(/\b\d{6}\b/g, '').trim();

    const colony = nomAddr.neighbourhood || nomAddr.residential || getMb('neighborhood') || '';
    const area = nomAddr.suburb || getMb('locality') || colony || '';
    const village = nomAddr.village || nomAddr.hamlet || '';
    const mandal = nomAddr.county || nomAddr.subdistrict || nomAddr.tehsil || nomAddr.municipality || getMb('locality') || '';
    const city = nomAddr.city || nomAddr.town || nomAddr.municipality || getMb('place') || '';
    const district = nomAddr.state_district || nomAddr.district || getMb('district') || city || 'Hyderabad';
    const state = nomAddr.state || getMb('region') || 'Telangana';
    const pincode = nomAddr.postcode || getMb('postcode') || '';
    const country = nomAddr.country || getMb('country') || 'India';

    // 2. Synthesize clean Address Line 1 (House No, Flat No, Road Number / Street)
    const line1Parts = [];
    if (houseNumber) line1Parts.push(`H.No ${houseNumber}`);
    if (road && !line1Parts.includes(road)) line1Parts.push(road);
    const line1 = line1Parts.length > 0 ? line1Parts.join(', ') : (road || colony || area || 'Main Road');

    // 3. Synthesize clean Address Line 2 (Colony, Area, Village, Mandal)
    const line2Parts = [];
    if (colony && colony !== road && !line2Parts.includes(colony)) line2Parts.push(colony);
    if (area && !line2Parts.includes(area) && area !== colony && area !== road) line2Parts.push(area);
    if (village && !line2Parts.includes(village) && village !== area && village !== colony) line2Parts.push(village);
    if (mandal && !line2Parts.includes(mandal) && mandal !== city) {
      line2Parts.push(mandal.toLowerCase().includes('mandal') ? mandal : `${mandal} Mandal`);
    }
    const line2 = line2Parts.join(', ');

    // 4. Synthesize Landmark
    const landmark = mandal ? (mandal.toLowerCase().includes('mandal') ? mandal : `${mandal} Mandal`) : colony || area || '';

    // 5. Build full hierarchical formatted string:
    // House No, Road, Colony, Area, Village, Mandal, District, City, State - PIN, Country
    const fullParts = [];
    if (line1) fullParts.push(line1);
    if (line2) fullParts.push(line2);
    if (district && district !== city && !fullParts.includes(district)) {
      fullParts.push(district.toLowerCase().includes('district') ? district : `${district} District`);
    }
    if (city && !fullParts.includes(city)) fullParts.push(city);
    if (state) {
      fullParts.push(pincode ? `${state} - ${pincode}` : state);
    } else if (pincode) {
      fullParts.push(pincode);
    }
    if (country && !fullParts.includes(country)) fullParts.push(country);

    const fullAddress = fullParts.length > 0 ? fullParts.join(', ') : (mbFeat?.place_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);

    const hierarchy = {
      houseNumber: houseNumber || null,
      roadNumber: road || null,
      colonyName: colony || null,
      areaName: area || null,
      villageName: village || null,
      mandal: mandal || null,
      district: district || null,
      city: city || district || 'Hyderabad',
      pincode: pincode || null,
      state: state || 'Telangana',
      country: country || 'India',
    };

    res.json({
      success: true,
      latitude: lat,
      longitude: lng,
      houseNumber,
      road,
      colony,
      area,
      village,
      mandal,
      district,
      city: city || district || 'Hyderabad',
      state,
      pincode,
      country,
      line1,
      line2,
      landmark,
      fullAddress,
      formattedAddress: fullAddress,
      hierarchy,
    });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.status(500).json({ error: err.message || 'Failed to reverse geocode coordinates.' });
  }
});

/**
 * GET /api/tracking/search-address
 * Forward geocodes a location query (e.g. "Khammam", "Uppal, Hyderabad") using Mapbox Places API
 * with server-side MAPBOX_ACCESS_TOKEN. Never fails due to missing client environment variables or CORS.
 */
router.get('/search-address', async (req, res) => {
  try {
    const q = req.query.q || req.query.query;
    if (!q || String(q).trim().length < 2) {
      return res.json({ success: true, results: [] });
    }

    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.warn('[Search Address Mapbox] MAPBOX_ACCESS_TOKEN not set on server.');
      return res.json({ success: true, results: [] });
    }
    const mbUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(String(q).trim())}.json?access_token=${token}&country=in&limit=6`;

    const data = await fetchJson(mbUrl);
    if (!data || !Array.isArray(data.features)) {
      return res.json({ success: true, results: [] });
    }

    const results = data.features.map((feat) => {
      const [lng, lat] = feat.center || [0, 0];
      const ctx = feat.context || [];
      const getCtx = (prefix) => ctx.find((c) => c.id && c.id.startsWith(prefix))?.text;

      const pincode = getCtx('postcode') || '';
      const locality = getCtx('neighborhood') || getCtx('locality') || feat.text || '';
      const city = getCtx('place') || '';
      const district = getCtx('district') || city;
      const state = getCtx('region') || '';
      const country = getCtx('country') || 'India';
      const formatted = feat.place_name || feat.text || q;
      const houseNumber = feat.properties?.address || '';
      const road = (feat.text !== city && feat.text !== pincode && feat.text !== locality ? feat.text : '') || locality;

      const line1 = [houseNumber ? `H.No ${houseNumber}` : '', road].filter(Boolean).join(', ') || formatted.split(',')[0];
      const line2 = [locality, district].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i && !line1.includes(v)).join(', ');

      return {
        fullAddress: formatted,
        formattedAddress: formatted,
        houseNumber: houseNumber || undefined,
        road: road || undefined,
        neighborhood: locality || undefined,
        colony: locality || undefined,
        area: locality || undefined,
        city: city || undefined,
        district: district || undefined,
        state: state || undefined,
        country,
        pincode: pincode || undefined,
        line1,
        line2,
        landmark: locality || district || '',
        latitude: lat,
        longitude: lng,
        hierarchy: {
          houseNumber: houseNumber || null,
          roadNumber: road || null,
          colonyName: locality || null,
          areaName: locality || null,
          villageName: null,
          mandal: district || null,
          district: district || null,
          city: city || district || '',
          pincode: pincode || null,
          state: state || null,
          country: country || 'India',
        },
      };
    });

    res.json({ success: true, results });
  } catch (err) {
    console.error('Search address geocoding error:', err);
    res.status(500).json({ error: err.message || 'Failed to search address.' });
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
                lat: true,
                lng: true,
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

    const vendorLat = delivery.order?.vendor?.lat || 17.3732;
    const vendorLng = delivery.order?.vendor?.lng || 78.5385;

    const pickupLat = delivery.pickupLat || vendorLat;
    const pickupLng = delivery.pickupLng || vendorLng;
    const dropoffLat = delivery.dropoffLat || (pickupLat + 0.015);
    const dropoffLng = delivery.dropoffLng || (pickupLng - 0.008);

    // Sanitize dropoffAddress so strings like ", , " don't reach customer UI
    let cleanDropoffAddress = delivery.dropoffAddress || '';
    if (cleanDropoffAddress.replace(/[,\s]/g, '').length === 0) {
      cleanDropoffAddress = 'Customer Doorstep, Dilsukhnagar, Hyderabad';
    }

    // Get live in-memory location ping if actively streaming, or fallback to rider profile coords
    const livePing = getDeliveryLocation(delivery.id);
    const lastLat = livePing?.lat ?? delivery.riderProfile?.currentLat ?? pickupLat;
    const lastLng = livePing?.lng ?? delivery.riderProfile?.currentLng ?? pickupLng;

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
        lat: pickupLat,
        lng: pickupLng,
      },
      dropoff: {
        name: delivery.dropoffName,
        address: cleanDropoffAddress,
        phone: delivery.dropoffPhone,
        lat: dropoffLat,
        lng: dropoffLng,
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
