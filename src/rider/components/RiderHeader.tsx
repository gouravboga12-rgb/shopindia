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
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Rider Identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-md text-lg">
              {user?.name ? user.name[0].toUpperCase() : 'R'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                isOnline ? 'bg-emerald-500 ring-2 ring-emerald-400/50 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base text-slate-100">{user?.name || 'Delivery Partner'}</span>
              {profile?.isApproved ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> KYC Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/30">
                  <AlertCircle className="w-3 h-3" /> KYC Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {profile?.vehicleType ? `${profile.vehicleType.toUpperCase()} • ` : ''}
              Radius: {profile?.serviceRadiusKm || 25} km
            </p>
          </div>
        </div>

        {/* Center / Right: Online Status Toggle & Wallet */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Wallet Balance Pill */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold text-emerald-400">
              ₹{(profile?.walletBalance || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Online Toggle Switch */}
          <button
            onClick={toggleOnline}
            className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full font-semibold text-xs sm:text-sm transition-all shadow-lg active:scale-95 ${
              isOnline
                ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Power className={`w-4 h-4 ${isOnline ? 'animate-pulse' : ''}`} />
            <span>{isOnline ? 'ONLINE' : 'GO ONLINE'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
