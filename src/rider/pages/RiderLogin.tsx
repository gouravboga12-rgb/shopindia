import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Bike,
  ShieldCheck,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import { detectCurrentLocationWithMapbox, type GeocodedAddress } from '../../lib/mapbox';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';
import {
  PARTNER_SKILLS,
  PARTNER_TYPES,
  type PartnerType,
} from '../../data/partnerSkills';

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
  const [detectedDetails, setDetectedDetails] = useState<GeocodedAddress | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    partnerType: 'delivery' as PartnerType,
    skills: [] as string[],
    experienceYears: 1,
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

  const handlePartnerTypeSelect = (type: PartnerType) => {
    setFormData((prev) => ({
      ...prev,
      partnerType: type,
    }));
  };

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skillId);
      const nextSkills = exists
        ? prev.skills.filter((s) => s !== skillId)
        : [...prev.skills, skillId];
      return { ...prev, skills: nextSkills };
    });
  };

  const handleSelectAllCategory = (category: 'home' | 'vehicle') => {
    const categorySkills = PARTNER_SKILLS.filter((s) => s.category === category).map((s) => s.id);
    setFormData((prev) => {
      const allSelected = categorySkills.every((id) => prev.skills.includes(id));
      let nextSkills: string[];
      if (allSelected) {
        nextSkills = prev.skills.filter((id) => !categorySkills.includes(id));
      } else {
        nextSkills = Array.from(new Set([...prev.skills, ...categorySkills]));
      }
      return { ...prev, skills: nextSkills };
    });
  };

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setError(null);
    try {
      const geocoded = await detectCurrentLocationWithMapbox();
      setDetectedDetails(geocoded);

      setFormData((prev) => ({
        ...prev,
        address: geocoded.fullAddress,
        currentLat: geocoded.latitude,
        currentLng: geocoded.longitude,
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not detect your GPS location.');
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
        // Validate service skills if partner is service or both
        if (
          (formData.partnerType === 'service' || formData.partnerType === 'both') &&
          formData.skills.length === 0
        ) {
          throw new Error('Please select at least one service skill to register as a service partner.');
        }

        const res = await fetch('/api/rider/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        setSuccessMsg('Registration submitted! You can now log into your dashboard to start receiving dispatches.');
        setTimeout(() => {
          setIsRegister(false);
          setSuccessMsg(null);
        }, 2000);
      } else {
        // Login
        const res = await fetch('/api/rider/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
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

  const homeSkills = PARTNER_SKILLS.filter((s) => s.category === 'home');
  const vehicleSkills = PARTNER_SKILLS.filter((s) => s.category === 'vehicle');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 text-slate-800">
      <div className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur-sm" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Bike className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            {isRegister ? 'Partner Onboarding (Delivery & Services)' : 'Partner Dispatch Portal'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isRegister
              ? 'Join ShopIndia as a Quick-Commerce Delivery or Doorstep Service Partner'
              : 'Sign in to access your radar feed, active bookings, and wallet earnings'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {/* Partner Specialization Selector (in Registration Mode) */}
          {isRegister && (
            <div className="space-y-2 pb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Choose Partner Specialization
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PARTNER_TYPES.map((type) => {
                  const isSelected = formData.partnerType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handlePartnerTypeSelect(type.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xl">{type.icon}</span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900 leading-tight">{type.label}</div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">{type.sublabel}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Multi-Select Service Skills (When service or both is selected) */}
          {isRegister && (formData.partnerType === 'service' || formData.partnerType === 'both') && (
            <div className="space-y-4 p-4 bg-orange-50/40 border border-orange-200 rounded-2xl animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <label className="text-xs font-bold text-orange-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    2. Select Your Service Skills (Multiple Allowed)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Pick all services you can professionally deliver at customers&apos; doorsteps
                  </p>
                </div>
                <span className="self-start sm:self-auto text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {formData.skills.length} Selected
                </span>
              </div>

              {/* Home Services Group */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">🏠 Home & Appliance Services</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllCategory('home')}
                    className="text-[11px] text-orange-600 hover:underline font-bold cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {homeSkills.map((skill) => {
                    const isChecked = formData.skills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-base">{skill.icon}</span>
                          <span className="line-clamp-1">{skill.name}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vehicle Services Group */}
              <div className="space-y-2 pt-2 border-t border-orange-200/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">🚗 Vehicle Care & Roadside Assistance</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllCategory('vehicle')}
                    className="text-[11px] text-orange-600 hover:underline font-bold cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vehicleSkills.map((skill) => {
                    const isChecked = formData.skills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-base">{skill.icon}</span>
                          <span className="line-clamp-1">{skill.name}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Experience Years */}
              <div className="pt-2 border-t border-orange-200/60">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Professional Experience
                </label>
                <select
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value={1}>1 Year of Field Experience</option>
                  <option value={2}>2 Years of Experience</option>
                  <option value={3}>3 - 5 Years (Experienced Technician)</option>
                  <option value={6}>6 - 10 Years (Senior Specialist)</option>
                  <option value={11}>10+ Years (Master Technician)</option>
                </select>
              </div>
            </div>
          )}

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="off"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone (WhatsApp)</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  autoComplete="off"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                />
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="rider@shopindia.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-bold cursor-pointer transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Registration KYC & Vehicle Section */}
          {isRegister && (
            <div className="pt-2 space-y-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Vehicle & Documents (KYC)
                </span>
                {formData.partnerType === 'service' && (
                  <span className="text-[10px] text-slate-500 italic">Vehicle Optional for Technicians</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Type</label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  >
                    <option value="bike">Motorcycle (Bike)</option>
                    <option value="scooter">Electric Scooter</option>
                    <option value="van">Delivery Van</option>
                    <option value="cycle">Bicycle</option>
                    {formData.partnerType === 'service' && <option value="none">No Vehicle / Public Transit</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Number {formData.partnerType === 'service' ? '(Optional)' : ''}
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    placeholder="TS 09 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Driving License (DL) Number {formData.partnerType === 'service' ? '(Optional)' : ''}
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="TS0920230004567"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaarNumber"
                    placeholder="12-digit UID"
                    value={formData.aadhaarNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    name="panNumber"
                    placeholder="ABCDE1234F"
                    value={formData.panNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Base Station / Address</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="text-[11px] text-orange-600 hover:text-orange-700 flex items-center gap-1 font-bold disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-bounce' : ''}`} />
                    <span>{isDetectingLocation ? 'Detecting Location...' : 'Auto-Detect Location (GPS)'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  name="address"
                  placeholder="Road No, Colony/Village, Mandal, District/City, State, Pincode"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
                />

                {/* Structured Breakdown Card if location detected */}
                {detectedDetails && (
                  <div className="mt-2.5 p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl text-xs space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-800 flex items-center gap-1.5 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-orange-600" /> Detected Address Details
                      </span>
                      <span className="text-[9px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        GPS Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 pt-1 border-t border-orange-200/60">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Road / Street</span>
                        <strong className="text-slate-900 text-[11px]">{detectedDetails.road || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Colony / Village</span>
                        <strong className="text-slate-900 text-[11px]">
                          {detectedDetails.colony || detectedDetails.village || detectedDetails.neighborhood || 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Mandal</span>
                        <strong className="text-slate-900 text-[11px]">{detectedDetails.mandal || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">District / City</span>
                        <strong className="text-slate-900 text-[11px]">
                          {detectedDetails.district || detectedDetails.city || 'N/A'}
                          {detectedDetails.city && detectedDetails.district && detectedDetails.city !== detectedDetails.district
                            ? ` (${detectedDetails.city})`
                            : ''}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">State</span>
                        <strong className="text-slate-900 text-[11px]">{detectedDetails.state || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">PIN Code & Country</span>
                        <strong className="text-orange-700 font-mono text-[11px]">{detectedDetails.pincode || 'N/A'}</strong>
                        <span className="text-slate-500 ml-1">({detectedDetails.country || 'India'})</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Service Radius Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Operating Radius</span>
                  <span className="text-orange-600 font-bold">{formData.serviceRadiusKm} km</span>
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
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>10 km (Local)</span>
                  <span>50 km (Citywide)</span>
                  <span>100 km (Regional)</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>
                  {isRegister
                    ? formData.partnerType === 'service'
                      ? 'Submit Service Professional Application'
                      : formData.partnerType === 'both'
                      ? 'Submit All-Rounder Application'
                      : 'Submit Delivery Partner Application'
                    : 'Sign In as Fleet Partner'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {isRegister ? (
            <p>
              Already an approved partner?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-orange-600 hover:underline font-bold cursor-pointer"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New delivery or service professional?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-orange-600 hover:underline font-bold cursor-pointer"
              >
                Apply & Register (KYC)
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Rider OTP Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={formData.email}
        portalType="rider"
        themeColor="orange"
        title="Delivery Partner Password Reset"
        roleBadge="Delivery Partner"
      />
    </div>
  );
};
