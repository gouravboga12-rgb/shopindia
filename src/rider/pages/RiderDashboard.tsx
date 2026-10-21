import React from 'react';
import { useRider } from '../context/RiderContext';
import { ActiveDeliveryView } from './ActiveDeliveryView';
import {
  Radar,
  Power,
  Zap,
  TrendingUp,
  Package,
  Clock,
  ShieldCheck,
  AlertCircle,
  Navigation,
  CheckCircle2,
} from 'lucide-react';

interface RiderDashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({ onNavigateToTab }) => {
  const { profile, isOnline, toggleOnline, activeDelivery, incomingBroadcast, acceptOrder } = useRider();

  // If there is an active assigned delivery, prioritize rendering the active turn-by-turn view
  if (activeDelivery) {
    return <ActiveDeliveryView />;
  }

  return (
    <div className="space-y-6 pb-24 text-slate-100 animate-in fade-in duration-200">
      
      {/* Shift Overview Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                {isOnline ? 'Active on Dispatch Radar' : 'Standby / Offline'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              {isOnline ? 'Scanning Nearby Quick Orders 🛵' : 'Ready to Start Delivering?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Operating within <span className="text-orange-400 font-bold">{profile?.serviceRadiusKm || 25} km</span> radius of your base station
            </p>
          </div>

          <button
            onClick={toggleOnline}
            className={`px-6 py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
              isOnline
                ? 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/30'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            <Power className="w-5 h-5" />
            <span>{isOnline ? 'GO OFFLINE' : 'GO ONLINE & RECEIVE ORDERS'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Wallet Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Wallet Balance</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
            ₹{(profile?.walletBalance || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Instant withdrawable</span>
        </div>

        {/* Deliveries Completed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Completed Trips</span>
            <Package className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {profile?.totalDeliveries || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Lifetime deliveries</span>
        </div>

        {/* Service Radius */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Service Radius</span>
            <Navigation className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {profile?.serviceRadiusKm || 25} <span className="text-xs font-normal text-slate-400">km</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Coverage distance</span>
        </div>

        {/* Partner Rating */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Partner Rating</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400">
            ★ {profile?.rating ? profile.rating.toFixed(1) : '5.0'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Top rated tier</span>
        </div>
      </div>

      {/* Radar Standby Screen */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
        {isOnline ? (
          <div className="space-y-4 max-w-md mx-auto">
            {/* Animated Radar Pulse concentric circles */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-orange-500/20 animate-ping" />
              <div className="absolute inset-4 rounded-full border border-orange-500/40 animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/50 flex items-center justify-center shadow-lg shadow-orange-500/20 text-orange-400">
                <Radar className="w-10 h-10 animate-spin" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white">Radar Active — Listening for Dispatches</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a local vendor broadcasts an order within your {profile?.serviceRadiusKm || 25} km radius, an audio alert and acceptance card will appear immediately.
            </p>

            <div className="pt-2 flex justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> High priority queue
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                10-30 min deliveries
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-700">
              <Power className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">You are Currently Offline</h3>
            <p className="text-xs text-slate-400">
              Switch your status to Online to start receiving delivery broadcast alerts and earn instantly.
            </p>
            <button
              onClick={toggleOnline}
              className="mt-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              GO ONLINE NOW
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
