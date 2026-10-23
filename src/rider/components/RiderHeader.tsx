import React from 'react';
import { useRider } from '../context/RiderContext';
import { useAuth } from '../../context/AuthContext';
import { Power, Wallet, ShieldCheck, AlertCircle, LogOut } from 'lucide-react';

interface RiderHeaderProps {
  onLogout?: () => void;
}

export const RiderHeader: React.FC<RiderHeaderProps> = () => {
  const { profile, isOnline, toggleOnline } = useRider();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200/80 text-slate-800 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Rider Identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-sm text-base">
              {user?.name ? user.name[0].toUpperCase() : 'R'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500 ring-2 ring-emerald-400/50 animate-pulse' : 'bg-slate-400'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base text-slate-900">{user?.name || 'Delivery Partner'}</span>
              {profile?.isApproved ? (
                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" /> KYC Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3 h-3" /> KYC Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {profile?.vehicleType ? `${profile.vehicleType.toUpperCase()} • ` : ''}
              Radius: {profile?.serviceRadiusKm || 25} km
            </p>
          </div>
        </div>

        {/* Center / Right: Online Status Toggle & Wallet */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Wallet Balance Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-emerald-200/80 shadow-2xs">
            <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            <span className="text-xs sm:text-sm font-black text-emerald-700">
              ₹{(profile?.walletBalance || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Online Toggle Switch */}
          <button
            onClick={toggleOnline}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
            }`}
          >
            <Power className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOnline ? 'animate-pulse' : ''}`} />
            <span>{isOnline ? 'ONLINE' : 'GO ONLINE'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
