import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bike, ShieldCheck, MapPin, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { detectCurrentLocationWithMapbox } from '../../lib/mapbox';

interface RiderLoginProps {
  initialRegister?: boolean;
}

export const RiderLogin: React.FC<RiderLoginProps> = ({ initialRegister = false }) => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    aadhaarNumber: '',
    panNumber: '',
    address: '',
    currentLat: undefined as number | undefined,
    currentLng: undefined as number | undefined,
    serviceRadiusKm: 25,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Mapbox Reverse Geocode GPS coordinates into clean address
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setError(null);
    try {
      const geocoded = await detectCurrentLocationWithMapbox();
      setFormData((prev) => ({
        ...prev,
        address: geocoded.fullAddress,
        currentLat: geocoded.latitude,
        currentLng: geocoded.longitude,
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not detect location. Please type manually.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await fetch('/api/rider/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        setSuccessMsg('Rider registration submitted! You can now log in.');
        setTimeout(() => setIsRegister(false), 1500);
      } else {
        const res = await fetch('/api/rider/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        login(data.token, data.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full blur-sm" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-orange-500/20">
            <Bike className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {isRegister ? 'Delivery Partner Onboarding' : 'Rider Partner Login'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isRegister
              ? 'Join the ShopIndia quick-commerce fleet and earn daily'
              : 'Sign in to access your dispatch radar & active trips'}
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Phone (WhatsApp)</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              placeholder="rider@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Registration KYC & Vehicle Section */}
          {isRegister && (
            <div className="pt-2 space-y-4 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle Type</label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="bike">Motorcycle (Bike)</option>
                    <option value="scooter">Electric Scooter</option>
                    <option value="van">Delivery Van</option>
                    <option value="cycle">Bicycle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    placeholder="TS 09 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Driving License (DL) Number</label>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="TS0920230004567"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaarNumber"
                    placeholder="12-digit UID"
                    value={formData.aadhaarNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    name="panNumber"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">Base Station / Address</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-medium disabled:opacity-50"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{isDetectingLocation ? 'Detecting via Mapbox...' : 'Auto-Detect GPS (Mapbox)'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="address"
                  placeholder="Area, Landmark, City, Pincode"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Service Radius Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Operating Radius</span>
                  <span className="text-orange-400 font-bold">{formData.serviceRadiusKm} km</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  name="serviceRadiusKm"
                  value={formData.serviceRadiusKm}
                  onChange={handleChange}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>10 km</span>
                  <span>50 km</span>
                  <span>100 km</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>{isRegister ? 'Submit Partner Application' : 'Sign In as Delivery Partner'}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {isRegister ? (
            <p>
              Already an approved delivery partner?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-orange-400 hover:underline font-bold"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New delivery partner?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-orange-400 hover:underline font-bold"
              >
                Apply & Register (KYC)
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
