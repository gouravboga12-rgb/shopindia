/**
 * Mapbox Geocoding & Location Utility
 * Utilizes VITE_MAPBOX_TOKEN to perform reverse geocoding from GPS coordinates.
 */

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export interface GeocodedAddress {
  fullAddress: string;
  road?: string;
  neighborhood?: string;
  mandal?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
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
          msg = 'Location permission denied. Please allow location access in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
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
 * Reverse geocode longitude and latitude into structured address components using Mapbox API
 */
export async function reverseGeocodeMapbox(
  longitude: number,
  latitude: number
): Promise<GeocodedAddress> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&country=in`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mapbox geocoding error: ${response.statusText}`);
  }

  const data = await response.json();
  const feature = data.features?.[0];

  if (!feature) {
    return {
      fullAddress: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
      latitude,
      longitude,
    };
  }

  const context: Array<{ id: string; text: string }> = feature.context || [];

  const getContextText = (prefix: string) => {
    const item = context.find((c) => c.id.startsWith(prefix));
    return item ? item.text : undefined;
  };

  const road = feature.text || undefined;
  const neighborhood = getContextText('neighborhood');
  const mandal = getContextText('locality') || neighborhood;
  const city = getContextText('place');
  const district = getContextText('district') || city;
  const state = getContextText('region');
  const country = getContextText('country');
  const pincode = getContextText('postcode');

  return {
    fullAddress: feature.place_name || '',
    road,
    neighborhood,
    mandal,
    city,
    district,
    state,
    country,
    pincode,
    latitude,
    longitude,
  };
}

/**
 * Combined helper: Get current GPS coordinates + Reverse Geocode via Mapbox
 */
export async function detectCurrentLocationWithMapbox(): Promise<GeocodedAddress> {
  const coords = await getBrowserCoordinates();
  return await reverseGeocodeMapbox(coords.longitude, coords.latitude);
}
