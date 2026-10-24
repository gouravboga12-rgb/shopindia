import React, { useState } from 'react';
import { 
  MapPin, Navigation, Search, Check, X, 
  AlertCircle, History, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';

export interface DetectedLocation {
  formatted: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

export const detectCurrentLocation = async (): Promise<DetectedLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const area = addr.suburb || addr.neighbourhood || addr.road || addr.residential || addr.hamlet || '';
          const city = addr.city || addr.town || addr.village || addr.city_district || addr.state_district || 'Bengaluru';
          const state = addr.state || '';
          const postcode = addr.postcode || '';

          const parts = [area, city, postcode].filter(Boolean);
          const formatted = parts.length > 0 ? parts.join(', ') : `${city}, ${state}`;

          resolve({ formatted: `📍 ${formatted}`, city, pincode: postcode, lat: latitude, lng: longitude });
        } catch {
          resolve({ formatted: `📍 Location (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`, lat: latitude, lng: longitude });
        }
      },
      (err) => {
        let msg = 'Unable to retrieve your location.';
        if (err.code === err.PERMISSION_DENIED) msg = 'Location permission was denied. Please allow location access or type manually.';
        else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location information is unavailable.';
        else if (err.code === err.TIMEOUT) msg = 'Location request timed out.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
    );
  });
};

export interface PopularCityConfig {
  name: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  pincode: string;
}

export const POPULAR_CITIES: PopularCityConfig[] = [
  { name: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777, city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { name: 'Delhi NCR, New Delhi', lat: 28.6139, lng: 77.2090, city: 'New Delhi', state: 'Delhi', pincode: '110001' },
  { name: 'Hyderabad, Telangana', lat: 17.3850, lng: 78.4867, city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  { name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707, city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  { name: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567, city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  { name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639, city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
  { name: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714, city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { name: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873, city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  { name: 'Kochi, Kerala', lat: 9.9312, lng: 76.2673, city: 'Kochi', state: 'Kerala', pincode: '682001' }
];

export const LocationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { location, setLocation } = useApp();
  const [manualInput, setManualInput] = useState(location.replace(/^📍\s*/, ''));
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [recentLocations, setRecentLocations] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('shopindia_recent_locations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveToRecent = (loc: string) => {
    const clean = loc.trim();
    if (!clean) return;
    const updated = [clean, ...recentLocations.filter(item => item !== clean)].slice(0, 4);
    setRecentLocations(updated);
    localStorage.setItem('shopindia_recent_locations', JSON.stringify(updated));
  };

  const handleUseGPS = async () => {
    setIsDetecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const loc = await detectCurrentLocation();
      setLocation(loc.formatted, {
        lat: loc.lat ?? null,
        lng: loc.lng ?? null,
        city: loc.city,
        pincode: loc.pincode
      });
      setManualInput(loc.formatted.replace(/^📍\s*/, ''));
      saveToRecent(loc.formatted);
      setSuccessMsg('Live location captured successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not fetch live location.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualInput.trim();
    if (!clean) return;
    const found = POPULAR_CITIES.find(c =>
      c.name.toLowerCase().includes(clean.toLowerCase()) ||
      c.city.toLowerCase().includes(clean.toLowerCase())
    );
    if (found) {
      setLocation(clean, { lat: found.lat, lng: found.lng, city: found.city, pincode: found.pincode });
    } else {
      setLocation(clean);
    }
    saveToRecent(clean);
    onClose();
  };

  const handleSelectCity = (cityConfig: PopularCityConfig | string) => {
    if (typeof cityConfig === 'string') {
      const found = POPULAR_CITIES.find(c => 
        c.name.toLowerCase() === cityConfig.toLowerCase() || 
        c.city.toLowerCase() === cityConfig.toLowerCase()
      );
      if (found) {
        setLocation(found.name, { lat: found.lat, lng: found.lng, city: found.city, pincode: found.pincode });
        saveToRecent(found.name);
      } else {
        setLocation(cityConfig);
        saveToRecent(cityConfig);
      }
    } else {
      setLocation(cityConfig.name, { lat: cityConfig.lat, lng: cityConfig.lng, city: cityConfig.city, pincode: cityConfig.pincode });
      saveToRecent(cityConfig.name);
    }
    onClose();
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentLocations([]);
    localStorage.removeItem('shopindia_recent_locations');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none text-left font-sans">
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-elevated border border-brand-border relative z-10 text-brand-graphite overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-brand-border pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center shadow-xs">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-brand-graphite font-heading">Choose Your Location</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Delivering orders & services to your doorstep</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Live GPS Detection Button */}
            <div className="mb-4">
              <button
                onClick={handleUseGPS}
                disabled={isDetecting}
                className="w-full p-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-75 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer font-heading"
              >
                {isDetecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Detecting GPS Location in Real Time...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={15} className="animate-pulse" />
                    <span>Detect My Live GPS Location</span>
                  </>
                )}
              </button>

              {successMsg && (
                <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                  <Check size={14} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="h-[1px] bg-slate-200 flex-1" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-heading">OR ENTER MANUALLY</span>
              <div className="h-[1px] bg-slate-200 flex-1" />
            </div>

            {/* Manual Search / Input Form */}
            <form onSubmit={handleManualSubmit} className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter house/flat no, street, area, city, pincode..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-blue rounded-2xl text-xs font-semibold text-brand-graphite focus:outline-none transition-all"
                />
                <Search size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="absolute right-1.5 top-1.5 px-4 py-2 bg-brand-blue disabled:bg-slate-300 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider font-heading hover:bg-blue-600 transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Recent Locations (Only if user has set/searched before) */}
            {recentLocations.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading">
                    Recently Used Locations
                  </span>
                  <button 
                    onClick={handleClearHistory}
                    className="text-[10px] text-slate-400 hover:text-red-500 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 size={10} />
                    <span>Clear</span>
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentLocations.map((loc) => {
                    const isCurrent = location === loc;
                    return (
                      <div
                        key={loc}
                        onClick={() => handleSelectCity(loc)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isCurrent
                            ? 'border-brand-blue bg-blue-50/40 text-brand-blue shadow-xs'
                            : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <History size={13} />
                          </div>
                          <span className="text-xs font-bold truncate max-w-[320px] block">{loc}</span>
                        </div>
                        {isCurrent && <Check size={14} className="text-brand-blue font-bold shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popular Cities Quick Select */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-heading block mb-1.5">
                Popular Cities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CITIES.map((city) => (
                  <button
                    key={city.name}
                    onClick={() => handleSelectCity(city)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer"
                  >
                    {city.city || city.name.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
