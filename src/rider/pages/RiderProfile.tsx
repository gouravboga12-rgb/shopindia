import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import {
  ShieldCheck,
  AlertCircle,
  Bike,
  Navigation,
  CheckCircle2,
  Wrench,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  PARTNER_SKILLS,
  PARTNER_TYPES,
  type PartnerType,
} from '../../data/partnerSkills';

export const RiderProfile: React.FC = () => {
  const { user } = useAuth();
  const { profile, updateRadius, updatePartnerProfile } = useRider();

  const [radius, setRadius] = useState(profile?.serviceRadiusKm || 25);
  const [isUpdatingRadius, setIsUpdatingRadius] = useState(false);
  const [radiusSaveSuccess, setRadiusSaveSuccess] = useState(false);

  // Partner specialization & skills state
  const [partnerType, setPartnerType] = useState<PartnerType>(
    (profile?.partnerType as PartnerType) || 'delivery'
  );
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [experienceYears, setExperienceYears] = useState<number>(
    profile?.experienceYears || 1
  );
  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [skillsSaveSuccess, setSkillsSaveSuccess] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  // Sync when profile loads
  useEffect(() => {
    if (profile) {
      setRadius(profile.serviceRadiusKm || 25);
      if (profile.partnerType) setPartnerType(profile.partnerType as PartnerType);
      if (profile.skills) setSkills(profile.skills);
      if (profile.experienceYears) setExperienceYears(profile.experienceYears);
    }
  }, [profile]);

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRadius(parseInt(e.target.value, 10));
  };

  const handleSaveRadius = async () => {
    setIsUpdatingRadius(true);
    await updateRadius(radius);
    setIsUpdatingRadius(false);
    setRadiusSaveSuccess(true);
    setTimeout(() => setRadiusSaveSuccess(false), 2000);
  };

  const toggleSkill = (skillId: string) => {
    setSkills((prev) => {
      const exists = prev.includes(skillId);
      return exists ? prev.filter((s) => s !== skillId) : [...prev, skillId];
    });
  };

  const handleSelectAllCategory = (category: 'home' | 'vehicle') => {
    const categorySkills = PARTNER_SKILLS.filter((s) => s.category === category).map((s) => s.id);
    setSkills((prev) => {
      const allSelected = categorySkills.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !categorySkills.includes(id));
      } else {
        return Array.from(new Set([...prev, ...categorySkills]));
      }
    });
  };

  const handleSaveSkills = async () => {
    setSkillsError(null);
    if ((partnerType === 'service' || partnerType === 'both') && skills.length === 0) {
      setSkillsError('Please select at least one service skill to accept doorstep service jobs.');
      return;
    }

    setIsSavingSkills(true);
    const ok = await updatePartnerProfile({
      partnerType,
      skills,
      experienceYears,
    });
    setIsSavingSkills(false);

    if (ok) {
      setSkillsSaveSuccess(true);
      setTimeout(() => setSkillsSaveSuccess(false), 2500);
    } else {
      setSkillsError('Failed to save profile changes. Please try again.');
    }
  };

  const homeSkills = PARTNER_SKILLS.filter((s) => s.category === 'home');
  const vehicleSkills = PARTNER_SKILLS.filter((s) => s.category === 'vehicle');

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">
      {/* Rider Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-orange-500/20">
              {user?.name ? user.name[0].toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900">{user?.name}</h2>
                {profile?.isApproved ? (
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> KYC Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> KYC Under Review
                  </span>
                )}
                <span className="text-[10px] sm:text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 capitalize">
                  {partnerType === 'both' ? '⚡ All-Rounder' : partnerType === 'service' ? '🛠️ Service Professional' : '🚚 Delivery Partner'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
              <p className="text-xs text-slate-500">{profile?.address || 'Zone: Madhapur, Hyderabad'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Specialization & Multi-Select Service Skills */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600">
            <Wrench className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Partner Specialization & Service Skills</h3>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            {skills.length} Skills Active
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Configure whether you handle quick-commerce order delivery, doorstep home and vehicle maintenance, or both. Vendors and regional hubs dispatch jobs matching your skills.
        </p>

        {/* Specialization Cards */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Partner Role</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PARTNER_TYPES.map((type) => {
              const isSelected = partnerType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setPartnerType(type.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{type.icon}</span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900">{type.label}</div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{type.sublabel}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Select Service Skills (When service or both is selected) */}
        {(partnerType === 'service' || partnerType === 'both') && (
          <div className="space-y-4 pt-3 border-t border-slate-100 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs font-bold text-orange-600 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Your Verified Skills (Multi-Select Enabled)
                </label>
                <p className="text-[11px] text-slate-500">
                  Select all services you are qualified to perform at customer locations
                </p>
              </div>
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
                  Toggle All Home
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {homeSkills.map((skill) => {
                  const isChecked = skills.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isChecked
                          ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
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
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">🚗 Vehicle Care & Roadside Assistance</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllCategory('vehicle')}
                  className="text-[11px] text-orange-600 hover:underline font-bold cursor-pointer"
                >
                  Toggle All Vehicle
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {vehicleSkills.map((skill) => {
                  const isChecked = skills.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isChecked
                          ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
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

            {/* Experience Selection */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Field Experience
              </label>
              <select
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value, 10))}
                className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
              >
                <option value={1}>1 Year of Field Experience</option>
                <option value={2}>2 Years of Experience</option>
                <option value={3}>3 - 5 Years (Experienced Technician)</option>
                <option value={6}>6 - 10 Years (Senior Specialist)</option>
                <option value={11}>10+ Years (Master Specialist)</option>
              </select>
            </div>
          </div>
        )}

        {skillsError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{skillsError}</span>
          </div>
        )}

        {skillsSaveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Specialization and service skills updated successfully!</span>
          </div>
        )}

        <button
          onClick={handleSaveSkills}
          disabled={isSavingSkills}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-2"
        >
          {isSavingSkills ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>{isSavingSkills ? 'Saving Changes...' : 'Save Specialization & Skills'}</span>
        </button>
      </div>

      {/* Operating Radius Slider (10 - 100 km) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600">
            <Navigation className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Delivery & Service Operating Radius</h3>
          </div>
          <span className="text-lg sm:text-xl font-black text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl">
            {radius} km
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Only broadcast deliveries and doorstep service requests within this distance from your base station will be sent to your device.
        </p>

        <div className="py-2">
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={radius}
            onChange={handleRadiusChange}
            className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-100 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-2">
            <span>10 km (Hyper-local)</span>
            <span>50 km (Citywide)</span>
            <span>100 km (Regional)</span>
          </div>
        </div>

        {radiusSaveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Operational radius updated to {radius} km!</span>
          </div>
        )}

        <button
          onClick={handleSaveRadius}
          disabled={isUpdatingRadius}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {isUpdatingRadius ? 'Saving...' : 'Save Preferred Radius'}
        </button>
      </div>

      {/* Vehicle & KYC Verification Details */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900">
          <Bike className="w-5 h-5 text-orange-600" />
          <h3 className="text-base font-bold">Vehicle & KYC Identification</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <span className="text-slate-500 font-medium">Vehicle Type</span>
            <p className="text-sm font-bold text-slate-900 capitalize mt-0.5">{profile?.vehicleType || 'Bike'}</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <span className="text-slate-500 font-medium">Vehicle Registration</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.vehicleNumber || 'Unregistered / Walk-in'}</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <span className="text-slate-500 font-medium">Driving License</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.licenseNumber || 'DL On File'}</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
            <span className="text-slate-500 font-medium">PAN Card</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{profile?.panNumber || 'Submitted'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
