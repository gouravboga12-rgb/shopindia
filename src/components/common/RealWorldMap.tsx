import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Compass, Layers, Maximize2 } from 'lucide-react';

interface PointCoord {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

interface RiderCoord {
  lat?: number;
  lng?: number;
  bearing?: number;
  speed?: number;
  name?: string;
  vehicleType?: string;
}

interface RealWorldMapProps {
  pickup: PointCoord;
  dropoff: PointCoord;
  rider?: RiderCoord | null;
  currentStage?: string;
  height?: string;
  darkMode?: boolean;
  viewerRole?: 'customer' | 'rider';
  onOpenNavigation?: () => void;
}

export const RealWorldMap: React.FC<RealWorldMapProps> = ({
  pickup,
  dropoff,
  rider,
  currentStage = 'picked_up',
  height = '240px',
  darkMode = true,
  viewerRole = 'customer',
  onOpenNavigation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{
    store?: L.Marker;
    customer?: L.Marker;
    rider?: L.Marker;
    routeLine?: L.Polyline;
  }>({});

  const [mapStyle, setMapStyle] = useState<'dark' | 'streets'>(
    darkMode ? 'dark' : 'streets'
  );
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Fallback coordinates if zero or invalid
  const pLat = pickup.lat && !isNaN(pickup.lat) ? pickup.lat : 17.3732;
  const pLng = pickup.lng && !isNaN(pickup.lng) ? pickup.lng : 78.5385;
  const dLat = dropoff.lat && !isNaN(dropoff.lat) ? dropoff.lat : 17.3912;
  const dLng = dropoff.lng && !isNaN(dropoff.lng) ? dropoff.lng : 78.5285;

  const rLat = rider?.lat && !isNaN(rider.lat) ? rider.lat : (pLat + dLat) / 2;
  const rLng = rider?.lng && !isNaN(rider.lng) ? rider.lng : (pLng + dLng) / 2;
  const bearing = rider?.bearing || 0;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [rLat, rLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      mapRef.current = map;
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    const map = mapRef.current;

    // Apply Tile Layer based on mapStyle
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let subdomains = 'abc';
    let tileSize = 256;
    let zoomOffset = 0;

    if (token) {
      tileSize = 512;
      zoomOffset = -1;
      subdomains = 'a';
      if (mapStyle === 'dark') {
        tileUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`;
      } else {
        tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`;
      }
    }

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      tileSize,
      zoomOffset,
      subdomains,
    }).addTo(map);

    // Initial resize trigger
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      // Keep map instance alive across re-renders
    };
  }, [mapStyle]);

  // Handle markers & routing polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Custom HTML Icons (Swiggy / Zomato / Uber aesthetics)
    const storeIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
          <div style="background: linear-gradient(135deg, #ea580c, #c2410c); color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 14px rgba(234,88,12,0.5); border: 2.5px solid #ffffff;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
          </div>
          <span style="background: rgba(15,23,42,0.92); color:#fdba74; font-size:10px; font-weight:800; padding:2px 7px; border-radius:6px; margin-top:3px; white-space:nowrap; border: 1px solid rgba(234,88,12,0.4); box-shadow:0 2px 8px rgba(0,0,0,0.3); max-width:130px; overflow:hidden; text-overflow:ellipsis;">
            ${pickup.name || 'Store'}
          </span>
        </div>
      `,
      iconSize: [34, 52],
      iconAnchor: [0, 0],
    });

    const customerIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
          <div style="background: linear-gradient(135deg, #10b981, #059669); color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 14px rgba(16,185,129,0.5); border: 2.5px solid #ffffff;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <span style="background: rgba(15,23,42,0.92); color:#6ee7b7; font-size:10px; font-weight:800; padding:2px 7px; border-radius:6px; margin-top:3px; white-space:nowrap; border: 1px solid rgba(16,185,129,0.4); box-shadow:0 2px 8px rgba(0,0,0,0.3); max-width:130px; overflow:hidden; text-overflow:ellipsis;">
            ${dropoff.name || 'Customer Doorstep'}
          </span>
        </div>
      `,
      iconSize: [34, 52],
      iconAnchor: [0, 0],
    });

    const riderIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(245,158,11,0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position:relative; background: linear-gradient(135deg, #f59e0b, #d97706); color:#0f172a; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 16px rgba(245,158,11,0.6); border: 3px solid #ffffff; transform: rotate(${bearing}deg); transition: transform 0.4s ease;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
          </div>
          <span style="background: #0f172a; color:#fde68a; font-size:9.5px; font-weight:900; font-family: monospace; padding:2px 8px; border-radius:9999px; margin-top:2px; border: 1.5px solid rgba(245,158,11,0.7); box-shadow:0 2px 10px rgba(0,0,0,0.4); white-space:nowrap;">
            ${rider?.name ? rider.name.split(' ')[0] : 'Partner'} • LIVE
          </span>
        </div>
      `,
      iconSize: [44, 60],
      iconAnchor: [0, 0],
    });

    // 1. Store Pickup Marker (only for rider, hidden for customer)
    if (viewerRole === 'customer') {
      if (markersRef.current.store) {
        map.removeLayer(markersRef.current.store);
        markersRef.current.store = undefined;
      }
    } else {
      if (!markersRef.current.store) {
        markersRef.current.store = L.marker([pLat, pLng], { icon: storeIcon }).addTo(map);
      } else {
        markersRef.current.store.setLatLng([pLat, pLng]);
        markersRef.current.store.setIcon(storeIcon);
      }
    }

    // 2. Update/Create Customer Marker
    if (!markersRef.current.customer) {
      markersRef.current.customer = L.marker([dLat, dLng], { icon: customerIcon }).addTo(map);
    } else {
      markersRef.current.customer.setLatLng([dLat, dLng]);
      markersRef.current.customer.setIcon(customerIcon);
    }

    // 3. Update/Create Rider Marker
    if (!markersRef.current.rider) {
      markersRef.current.rider = L.marker([rLat, rLng], { icon: riderIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      markersRef.current.rider.setLatLng([rLat, rLng]);
      markersRef.current.rider.setIcon(riderIcon);
    }

    // 4. Fetch Real Driving Polyline from OSRM
    // For Customer view: strictly route from Rider live location to Customer Doorstep!
    // For Rider view:
    // If assigned (heading to store): Rider -> Store
    // If picked_up (in transit): Rider -> Customer
    let isCancelled = false;

    const fetchRoute = async () => {
      let routeUrl = '';
      if (viewerRole === 'customer') {
        const startLng = (rLng && !isNaN(rLng)) ? rLng : pLng;
        const startLat = (rLat && !isNaN(rLat)) ? rLat : pLat;
        routeUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${dLng},${dLat}?overview=full&geometries=geojson`;
      } else {
        if (currentStage === 'assigned') {
          routeUrl = `https://router.project-osrm.org/route/v1/driving/${rLng},${rLat};${pLng},${pLat}?overview=full&geometries=geojson`;
        } else {
          routeUrl = `https://router.project-osrm.org/route/v1/driving/${rLng},${rLat};${dLng},${dLat}?overview=full&geometries=geojson`;
        }
      }

      try {
        const res = await fetch(routeUrl);
        if (!res.ok) throw new Error('OSRM route unavailable');
        const json = await res.json();
        const coords = json?.routes?.[0]?.geometry?.coordinates;

        if (coords && Array.isArray(coords) && coords.length > 0 && !isCancelled) {
          const latLngs: L.LatLngExpression[] = coords.map((c: [number, number]) => [c[1], c[0]]);

          if (markersRef.current.routeLine) {
            markersRef.current.routeLine.setLatLngs(latLngs);
          } else {
            markersRef.current.routeLine = L.polyline(latLngs, {
              color: '#3b82f6',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
              lineCap: 'round',
            }).addTo(map);
          }
          return;
        }
      } catch {
        // Fallback to straight segment polyline
      }

      if (!isCancelled) {
        const fallbackPath: L.LatLngExpression[] =
          viewerRole === 'customer'
            ? [
                [pLat, pLng],
                [dLat, dLng],
              ]
            : currentStage === 'assigned'
            ? [
                [rLat, rLng],
                [pLat, pLng],
              ]
            : [
                [rLat, rLng],
                [dLat, dLng],
              ];

        if (markersRef.current.routeLine) {
          markersRef.current.routeLine.setLatLngs(fallbackPath);
        } else {
          markersRef.current.routeLine = L.polyline(fallbackPath, {
            color: '#3b82f6',
            weight: 4.5,
            opacity: 0.8,
            dashArray: '8, 6',
          }).addTo(map);
        }
      }
    };

    fetchRoute();

    // 5. Fit bounds to encapsulate the relevant points
    try {
      const boundsPoints: [number, number][] =
        viewerRole === 'customer'
          ? [
              [(rLat && !isNaN(rLat)) ? rLat : pLat, (rLng && !isNaN(rLng)) ? rLng : pLng],
              [dLat, dLng],
            ]
          : currentStage === 'assigned'
          ? [
              [rLat, rLng],
              [pLat, pLng],
            ]
          : [
              [rLat, rLng],
              [dLat, dLng],
            ];

      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, {
        padding: [42, 42],
        maxZoom: 16,
      });
    } catch {
      // ignore bounds error
    }

    return () => {
      isCancelled = true;
    };
  }, [pLat, pLng, dLat, dLng, rLat, rLng, bearing, pickup.name, dropoff.name, rider?.name, viewerRole, currentStage]);

  // Recenter helper
  const handleRecenter = () => {
    if (!mapRef.current) return;
    const bounds = L.latLngBounds([
      [pLat, pLng],
      [rLat, rLng],
      [dLat, dLng],
    ]);
    mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  };

  // Center on rider
  const handleCenterRider = () => {
    if (!mapRef.current) return;
    mapRef.current.setView([rLat, rLng], 16, { animate: true });
  };

  // Turn-by-Turn GPS navigation link (Prioritize decimal coordinates so Google Maps never fails)
  const handleDirectNavigation = () => {
    if (onOpenNavigation) {
      onOpenNavigation();
      return;
    }
    const targetLat = viewerRole === 'rider' && currentStage === 'assigned' ? pLat : dLat;
    const targetLng = viewerRole === 'rider' && currentStage === 'assigned' ? pLng : dLng;
    const dest =
      targetLat && targetLng && !isNaN(targetLat)
        ? `${targetLat},${targetLng}`
        : encodeURIComponent(dropoff.address || dropoff.name || 'Customer');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-lg group"
      style={{ height }}
    >
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls Overlay (Top Right) */}
      <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/70 shadow-md">
        {/* Layer style toggle */}
        <button
          type="button"
          onClick={() =>
            setMapStyle((prev) => (prev === 'dark' ? 'streets' : 'dark'))
          }
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title={`Switch Map Theme: ${mapStyle === 'dark' ? 'Daylight Streets' : 'Dark Radar'}`}
        >
          <Layers className="w-3.5 h-3.5 text-orange-400" />
        </button>

        {/* Center on Rider */}
        <button
          type="button"
          onClick={handleCenterRider}
          className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Track Rider Location"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>

        {/* Recenter Full Route */}
        <button
          type="button"
          onClick={handleRecenter}
          className="p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Fit Whole Route"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1-Tap Google Maps Directions (Bottom Left) */}
      <div className="absolute bottom-2.5 left-2.5 z-[400]">
        <button
          type="button"
          onClick={handleDirectNavigation}
          className="flex items-center gap-1.5 bg-blue-600/95 hover:bg-blue-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-md backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
        >
          <Navigation className="w-3 h-3" />
          <span>Open Directions</span>
        </button>
      </div>

      {/* Real-time Telemetry Badge (Bottom Right) */}
      <div className="absolute bottom-2.5 right-12 z-[400] hidden sm:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700/60 text-[10px] text-slate-300 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>GPS: {rLat.toFixed(4)}, {rLng.toFixed(4)}</span>
      </div>
    </div>
  );
};
