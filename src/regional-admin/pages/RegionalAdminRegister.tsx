import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Building2, MapPin, RefreshCw } from 'lucide-react';
import { detectCurrentLocationWithMapbox, type GeocodedAddress } from '../../lib/mapbox';

interface RegionalAdminRegisterProps {
  onSwitchToLogin: () => void;
}

export const RegionalAdminRegister: React.FC<RegionalAdminRegisterProps> = ({ onSwitchToLogin }) => {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<GeocodedAddress | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    regionName: '',
    district: '',
    state: 'Telangana',
    assignedPincodes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Mapbox Reverse Geocoding to auto-fill Road, Area, Mandal, City, District, State, Country, and Pincode
  const handleDetectTerritory = async () => {
    setDetecting(true);
    setError(null);
    try {
      const geocoded = await detectCurrentLocationWithMapbox();
      setDetectedLocation(geocoded);

      const areaOrMandal = geocoded.mandal || geocoded.colony || geocoded.village || geocoded.neighborhood || geocoded.road;
      const cityOrDistrict = geocoded.city || geocoded.district || 'Hub';
      const autoRegionName = areaOrMandal ? `${areaOrMandal} Hub (${cityOrDistrict})` : `${cityOrDistrict} Regional Hub`;

      setFormData((prev) => ({
        ...prev,
        regionName: autoRegionName,
        district: geocoded.district || geocoded.city || prev.district,
        state: geocoded.state || prev.state,
        assignedPincodes: geocoded.pincode || prev.assignedPincodes,
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to detect territory via Mapbox GPS.');
    } finally {
      setDetecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const pincodeList = formData.assignedPincodes
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await fetch('/api/regional-admin/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedPincodes: pincodeList,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setSuccess('Application submitted! Once approved by Super Admin, your login credentials will be activated.');
      setTimeout(() => onSwitchToLogin(), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 text-slate-800">
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-sm" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Regional Hub Application
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Apply to operate and supervise quick-commerce and 3PL dispatch for your territory
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Manager Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="zone.lead@shopindia.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-3">
            {/* Mapbox Auto-Detect Button Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/50 border border-blue-200/70 p-3 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Territory & Postal Code Detection</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Auto-fill Road, Mandal, City, District & Pincode via Mapbox
                </p>
              </div>

              <button
                type="button"
                onClick={handleDetectTerritory}
                disabled={detecting}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
                <span>{detecting ? 'Locating...' : 'Auto-Detect via GPS'}</span>
              </button>
            </div>

            {/* Structured Breakdown Card if location detected */}
            {detectedLocation && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Detected Location Details
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto-Populated Below
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1 border-t border-blue-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Road / Street:</span>
                    <strong className="text-slate-900">{detectedLocation.road || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Colony / Village / Area:</span>
                    <strong className="text-slate-900">{detectedLocation.colony || detectedLocation.village || detectedLocation.neighborhood || detectedLocation.mandal || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Mandal / Locality:</span>
                    <strong className="text-slate-900">{detectedLocation.mandal || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">City:</span>
                    <strong className="text-slate-900">{detectedLocation.city || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">District:</span>
                    <strong className="text-slate-900">{detectedLocation.district || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">State & Country:</span>
                    <strong className="text-slate-900">{detectedLocation.state || 'Telangana'}, {detectedLocation.country || 'India'}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] font-medium">Postal Code (Pincode):</span>
                    <span className="font-mono font-bold text-blue-700">{detectedLocation.pincode || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Territory / Region Name</label>
              <input
                type="text"
                name="regionName"
                required
                placeholder="e.g. Hyderabad Central Hub or Bengaluru South"
                value={formData.regionName}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">District / Division</label>
                <input
                  type="text"
                  name="district"
                  placeholder="e.g. Hyderabad"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                >
                  <option value="Telangana">Telangana</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Postal Codes (Pincodes)</label>
              <input
                type="text"
                name="assignedPincodes"
                placeholder="500081, 500084, 500032 (comma-separated)"
                value={formData.assignedPincodes}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Submit Regional Application</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-500">
          <p>
            Already an approved Regional Manager?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:underline font-bold"
            >
              Sign In
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
