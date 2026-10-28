/**
 * Mapbox & Reverse Geocoding Utility
 * Connects with backend reverse-geocode service (/api/tracking/reverse-geocode)
 * with multi-provider fallback to accurately resolve:
 * Road Number / Street, Colony / Village, Mandal, District / City, State, Pincode, and Country.
 */

export interface GeocodedAddress {
  fullAddress: string;
  road?: string;
  neighborhood?: string;
  colony?: string;
  village?: string;
  mandal?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

/**
 * Request browser GPS coordinates via Geolocation API
 */
export function getBrowserCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Failed to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable on your device.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocode longitude and latitude into structured address components.
 * Prioritizes the backend reverse-geocode service (which holds Mapbox token + Nominatim).
 * Falls back to direct reverse geocoding if the backend is unreachable.
 */
export async function reverseGeocodeMapbox(
  longitude: number,
  latitude: number
): Promise<GeocodedAddress> {
  // 1. Try Backend Proxy with Mapbox Access Token + Nominatim
  try {
    const res = await fetch(`/api/tracking/reverse-geocode?lat=${latitude}&lng=${longitude}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return {
          fullAddress: data.formattedAddress || data.fullAddress,
          formattedAddress: data.formattedAddress || data.fullAddress,
          road: data.road || undefined,
          neighborhood: data.colony || data.village || undefined,
          colony: data.colony || undefined,
          village: data.village || undefined,
          mandal: data.mandal || undefined,
          city: data.city || undefined,
          district: data.district || undefined,
          state: data.state || undefined,
          country: data.country || 'India',
          pincode: data.pincode || undefined,
          latitude,
          longitude,
        };
      }
    }
  } catch (backendErr) {
    console.warn('Backend reverse-geocode failed, attempting direct fallback...', backendErr);
  }

  // 2. Client-side Nominatim Fallback (Direct OpenStreetMap API)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    const nomRes = await fetch(nomUrl);
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const addr = nomData?.address || {};

      const pincode = addr.postcode || '';
      const rawRoad = [addr.house_number, addr.road].filter(Boolean).join(' ');
      const road = rawRoad === pincode ? '' : rawRoad;

      const colony = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.residential || '';
      const village = addr.village || addr.hamlet || '';
      const mandal = addr.county || addr.subdistrict || addr.tehsil || addr.municipality || '';
      const city = addr.city || addr.town || addr.municipality || '';
      const district = addr.state_district || addr.district || city || '';
      const state = addr.state || '';
      const country = addr.country || 'India';

      const parts: string[] = [];
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

      const formatted = parts.length > 0 ? parts.join(', ') : nomData?.display_name || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;

      return {
        fullAddress: formatted,
        formattedAddress: formatted,
        road: road || undefined,
        neighborhood: colony || undefined,
        colony: colony || undefined,
        village: village || undefined,
        mandal: mandal || undefined,
        city: city || undefined,
        district: district || undefined,
        state: state || undefined,
        country,
        pincode: pincode || undefined,
        latitude,
        longitude,
      };
    }
  } catch (fallbackErr) {
    console.error('All reverse-geocoding sources exhausted:', fallbackErr);
  }

  // 3. Fallback to basic coordinates representation
  return {
    fullAddress: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
    formattedAddress: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
    latitude,
    longitude,
  };
}

/**
 * Combined helper: Get current GPS coordinates + Reverse Geocode
 */
export async function detectCurrentLocationWithMapbox(): Promise<GeocodedAddress> {
  const coords = await getBrowserCoordinates();
  return await reverseGeocodeMapbox(coords.longitude, coords.latitude);
}

/**
 * Search/forward geocode addresses using OpenStreetMap Nominatim with India bias
 */
export async function searchAddressesMapbox(query: string): Promise<GeocodedAddress[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=5`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const addr = item.address || {};
      const lat = parseFloat(item.lat) || 0;
      const lng = parseFloat(item.lon) || 0;
      const pincode = addr.postcode || '';
      const rawRoad = [addr.house_number, addr.road].filter(Boolean).join(' ');
      const road = rawRoad === pincode ? '' : rawRoad;
      const colony = addr.suburb || addr.neighbourhood || addr.village || addr.residential || '';
      const village = addr.village || '';
      const mandal = addr.county || addr.subdistrict || addr.tehsil || '';
      const city = addr.city || addr.town || addr.municipality || '';
      const district = addr.state_district || addr.district || city || '';
      const state = addr.state || '';
      const country = addr.country || 'India';
      const formatted = item.display_name || [road, colony, city, state, pincode].filter(Boolean).join(', ');

      return {
        fullAddress: formatted,
        formattedAddress: formatted,
        road: road || undefined,
        neighborhood: colony || undefined,
        colony: colony || undefined,
        village: village || undefined,
        mandal: mandal || undefined,
        city: city || undefined,
        district: district || undefined,
        state: state || undefined,
        country,
        pincode: pincode || undefined,
        latitude: lat,
        longitude: lng,
      };
    });
  } catch (err) {
    console.error('Failed to forward geocode query:', err);
    return [];
  }
}


