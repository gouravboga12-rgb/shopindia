import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import { User, ShieldCheck, AlertCircle, Bike, Navigation, MapPin, CheckCircle2 } from 'lucide-react';

export const RiderProfile: React.FC = () => {
  const { user } = useAuth();
  const { profile, updateRadius } = useRider();
  const [radius, setRadius] = useState(profile?.serviceRadiusKm || 25);
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRadius(parseInt(e.target.value, 10));
  };

  const handleSaveRadius = async () => {
    setIsUpdating(true);
    await updateRadius(radius);
    setIsUpdating(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 pb-24 text-slate-100 animate-in fade-in duration-200">
      
      {/* Rider Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-orange-500/20">
              {user?.name ? user.name[0].toUpperCase() : 'R'}
            </div>
            <div>
              <div className="flex items-center gap-2">
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
              </div>
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
              <p className="text-xs text-slate-400">{profile?.address || 'Operational Zone: Madhapur, Hyderabad'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Radius Slider (10 - 100 km) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-400">
            <Navigation className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Delivery Operating Radius</h3>
          </div>
          <span className="text-xl font-extrabold text-orange-400 bg-orange-950/70 border border-orange-500/30 px-3 py-1 rounded-xl">
            {radius} km
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Only broadcast deliveries within this distance from your base station will be pings to your device.
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

        {saveSuccess && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Operational radius updated to {radius} km!</span>
          </div>
        )}

        <button
          onClick={handleSaveRadius}
          disabled={isUpdating}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-60"
        >
          {isUpdating ? 'Saving...' : 'Save Preferred Radius'}
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
            <p className="text-sm font-bold text-white mt-0.5">{profile?.vehicleNumber || 'TS 09 AB 1234'}</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 font-medium">Driving License</span>
            <p className="text-sm font-bold text-white mt-0.5">{profile?.licenseNumber || 'DL Verified'}</p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
            <span className="text-slate-400 font-medium">PAN Card</span>
            <p className="text-sm font-bold text-white mt-0.5">{profile?.panNumber || 'ABCDE1234F'}</p>
          </div>
        </div>
      </div>

    </div>
  );
};
