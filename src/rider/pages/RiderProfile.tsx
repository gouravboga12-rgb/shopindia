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
    <div className="space-y-6 pb-24 text-slate-100 animate-in fade-in duration-200">
      {/* Rider Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-orange-500/20">
              {user?.name ? user.name[0].toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{user?.name}</h2>
                {profile?.isApproved ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" /> KYC Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5" /> KYC Under Review
                  </span>
                )}
                <span className="text-[11px] font-bold text-orange-400 bg-orange-950/80 px-2.5 py-0.5 rounded-full border border-orange-500/30 capitalize">
                  {partnerType === 'both' ? '⚡ All-Rounder' : partnerType === 'service' ? '🛠️ Service Professional' : '🚚 Delivery Partner'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
              <p className="text-xs text-slate-400">{profile?.address || 'Zone: Madhapur, Hyderabad'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Specialization & Multi-Select Service Skills */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-400">
            <Wrench className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Partner Specialization & Service Skills</h3>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-xl">
            {skills.length} Skills Active
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Configure whether you handle quick-commerce order delivery, doorstep home and vehicle maintenance, or both. Vendors and regional hubs dispatch jobs matching your skills.
        </p>

        {/* Specialization Cards */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Partner Role</label>
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
                      ? 'bg-orange-500/15 border-orange-500 text-white shadow-md shadow-orange-500/10'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl">{type.icon}</span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-orange-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-white">{type.label}</div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">{type.sublabel}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Select Service Skills (When service or both is selected) */}
        {(partnerType === 'service' || partnerType === 'both') && (
          <div className="space-y-4 pt-3 border-t border-slate-800 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="text-xs font-bold text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Your Verified Skills (Multi-Select Enabled)
                </label>
                <p className="text-[11px] text-slate-400">
                  Select all services you are qualified to perform at customer locations
                </p>
              </div>
            </div>

            {/* Home Services Group */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">🏠 Home & Appliance Services</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllCategory('home')}
                  className="text-[11px] text-orange-400 hover:underline font-semibold cursor-pointer"
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
                          ? 'bg-orange-500/20 border-orange-500 text-white font-semibold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-base">{skill.icon}</span>
                        <span className="line-clamp-1">{skill.name}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-orange-500 border-orange-500 text-slate-950'
                            : 'border-slate-600'
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
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">🚗 Vehicle Care & Roadside Assistance</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllCategory('vehicle')}
                  className="text-[11px] text-orange-400 hover:underline font-semibold cursor-pointer"
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
                          ? 'bg-orange-500/20 border-orange-500 text-white font-semibold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-base">{skill.icon}</span>
                        <span className="line-clamp-1">{skill.name}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-orange-500 border-orange-500 text-slate-950'
                            : 'border-slate-600'
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
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Field Experience
              </label>
              <select
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value, 10))}
                className="w-full sm:w-80 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
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
          <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{skillsError}</span>
          </div>
        )}

        {skillsSaveSuccess && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Specialization and service skills updated successfully!</span>
          </div>
        )}

        <button
          onClick={handleSaveSkills}
          disabled={isSavingSkills}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-2"
        >
          {isSavingSkills ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>{isSavingSkills ? 'Saving Changes...' : 'Save Specialization & Skills'}</span>
        </button>
      </div>

      {/* Operating Radius Slider (10 - 100 km) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-400">
            <Navigation className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Delivery & Service Operating Radius</h3>
          </div>
          <span className="text-xl font-extrabold text-orange-400 bg-orange-950/70 border border-orange-500/30 px-3 py-1 rounded-xl">
            {radius} km
          </span>
        </div>

        <p className="text-xs text-slate-400">
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
            className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2">
            <span>10 km (Hyper-local)</span>
            <span>50 km (Citywide)</span>
            <span>100 km (Regional)</span>
          </div>
        </div>

        {radiusSaveSuccess && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Operational radius updated to {radius} km!</span>
          </div>
        )}

        <button
          onClick={handleSaveRadius}
          disabled={isUpdatingRadius}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {isUpdatingRadius ? 'Saving...' : 'Save Preferred Radius'}
        </button>
      </div>

      {/* Vehicle & KYC Verification Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-white">
          <Bike className="w-5 h-5 text-orange-400" />
          <h3 className="text-base font-bold">Vehicle & KYC Identification</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 font-medium">Vehicle Type</span>
            <p className="text-sm font-bold text-white capitalize mt-0.5">{profile?.vehicleType || 'Bike'}</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 font-medium">Vehicle Registration</span>
            <p className="text-sm font-bold text-white mt-0.5">{profile?.vehicleNumber || 'Unregistered / Walk-in'}</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 font-medium">Driving License</span>
            <p className="text-sm font-bold text-white mt-0.5">{profile?.licenseNumber || 'DL On File'}</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 font-medium">PAN Card</span>
            <p className="text-sm font-bold text-white mt-0.5">{profile?.panNumber || 'Submitted'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
