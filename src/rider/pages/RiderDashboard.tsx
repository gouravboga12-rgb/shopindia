import React, { useState } from 'react';
import { useRider } from '../context/RiderContext';
import { ActiveDeliveryView } from './ActiveDeliveryView';
import {
  Radar,
  Power,
  TrendingUp,
  Package,
  Clock,
  Navigation,
  CheckCircle2,
  MapPin,
  RefreshCw,
  AlertCircle,
  Banknote,
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';

interface RiderDashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({ onNavigateToTab }) => {
  const { profile, isOnline, toggleOnline, activeDelivery, updateGpsLocation } = useRider();
  const [locating, setLocating] = useState(false);
  const [locFeedback, setLocFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleUpdateLocation = async () => {
    setLocating(true);
    setLocFeedback(null);
    const result = await updateGpsLocation();
    setLocating(false);
    if (result.success) {
      setLocFeedback({ type: 'success', text: 'GPS & base station synchronized via Mapbox' });
      setTimeout(() => setLocFeedback(null), 4000);
    } else {
      setLocFeedback({ type: 'error', text: result.error || 'Failed to detect location' });
    }
  };

  // If there is an active assigned delivery, prioritize rendering the active turn-by-turn view
  if (activeDelivery) {
    return <ActiveDeliveryView />;
  }

  return (
    <div className="space-y-5 sm:space-y-6 text-slate-800 animate-in fade-in duration-200">
      
      {/* Shift Overview Banner */}
      <div className="relative bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                {isOnline ? 'Active on Dispatch Radar' : 'Standby / Offline'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {isOnline ? 'Scanning Nearby Quick Orders 🛵' : 'Ready to Start Delivering?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Operating within <span className="text-orange-600 font-bold">{profile?.serviceRadiusKm || 25} km</span> radius of your base station
            </p>
          </div>

          <button
            onClick={toggleOnline}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer ${
              isOnline
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <Power className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{isOnline ? 'GO OFFLINE' : 'GO ONLINE & RECEIVE ORDERS'}</span>
          </button>
        </div>
      </div>

      {/* Floating Cash in Hand Alert Banner (if holding COD cash) */}
      {(profile?.codCashFloat ?? 0) > 0 && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
          (profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000)
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-orange-50 border-orange-200 text-orange-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              (profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000)
                ? 'bg-red-500 text-white border-red-600 shadow-xs'
                : 'bg-orange-500 text-white border-orange-600 shadow-xs'
            }`}>
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Cash in Hand: ₹{(profile?.codCashFloat ?? 0).toLocaleString('en-IN')}
                </span>
                {(profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000) && (
                  <span className="text-[10px] bg-red-200 text-red-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Radar Paused
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {(profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000)
                  ? 'Maximum float limit exceeded. Please remit cash to receive new order dispatches.'
                  : 'Customer COD cash held. Clear online via Razorpay or submit to your Regional Admin.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab?.('wallet')}
            className="self-start sm:self-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Clear Cash Float</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Manual GPS Location Bar (Mapbox Geocoding — Zero Background Polling) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Rider Base Station (Mapbox GPS)</span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Manual on-demand
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
              {profile?.address || 'No GPS coordinates recorded yet — click update below'}
            </p>
            {profile?.currentLat && profile?.currentLng && (
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Coords: {profile.currentLat.toFixed(4)}°N, {profile.currentLng.toFixed(4)}°E
              </p>
            )}
            {locFeedback && (
              <p className={`text-xs mt-1 font-medium flex items-center gap-1.5 ${
                locFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {locFeedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {locFeedback.text}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleUpdateLocation}
          disabled={locating}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Fetching GPS...' : 'Update GPS Location'}</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Wallet Balance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Wallet Balance</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            ₹{(profile?.walletBalance || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Instant withdrawable</span>
        </div>

        {/* Deliveries Completed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Completed Trips</span>
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {profile?.totalDeliveries || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Lifetime deliveries</span>
        </div>

        {/* Service Radius */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Service Radius</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {profile?.serviceRadiusKm || 25} <span className="text-xs font-normal text-slate-500">km</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Coverage distance</span>
        </div>

        {/* Partner Rating */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Partner Rating</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            ★ {profile?.rating ? profile.rating.toFixed(1) : '5.0'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Top rated tier</span>
        </div>
      </div>

      {/* Radar Standby Screen */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center shadow-xs relative overflow-hidden">
        {isOnline ? (
          <div className="space-y-4 max-w-md mx-auto">
            {/* Animated Radar Pulse concentric circles */}
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-orange-400/30 animate-ping" />
              <div className="absolute inset-3 sm:inset-4 rounded-full border border-orange-400/40 animate-pulse" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-50 border border-orange-300 flex items-center justify-center shadow-md shadow-orange-500/10 text-orange-600">
                <Radar className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900">Radar Active — Listening for Dispatches</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When a local vendor broadcasts an order within your {profile?.serviceRadiusKm || 25} km radius, an audio alert and acceptance card will appear immediately.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> High priority queue
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                10-30 min deliveries
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200">
              <Power className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">You are Currently Offline</h3>
            <p className="text-xs text-slate-500">
              Switch your status to Online to start receiving delivery broadcast alerts and earn instantly.
            </p>
            <button
              onClick={toggleOnline}
              className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              GO ONLINE NOW
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
