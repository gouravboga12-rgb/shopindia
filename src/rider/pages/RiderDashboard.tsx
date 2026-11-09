import React, { useState, useEffect } from 'react';
import { useRider } from '../context/RiderContext';
import { api } from '../../lib/api';
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
  Bell,
  Calendar,
  ArrowRight
} from 'lucide-react';

interface RiderDashboardProps {
  onNavigateToTab?: (tab: string, subTab?: 'trips' | 'cod_history' | 'scheduled_services') => void;
}

function parseSlotStartHour(timeSlotStr: string): number {
  if (!timeSlotStr) return 9;
  const raw = timeSlotStr.trim();
  const match = raw.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?(?:\s*-\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?)?/i);
  if (!match) return 9;

  let hour = parseInt(match[1], 10);
  const startMeridiem = (match[3] || '').toUpperCase();
  const endMeridiem = (match[6] || '').toUpperCase();
  const meridiem = startMeridiem || endMeridiem;

  if (meridiem === 'PM') {
    if (hour < 12) {
      hour += 12;
    }
  } else if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }
  return hour;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({ onNavigateToTab }) => {
  const { profile, isOnline, toggleOnline, activeDelivery, updateGpsLocation, refreshData, startServiceJob } = useRider();
  const [locating, setLocating] = useState(false);
  const [locFeedback, setLocFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [imminentService, setImminentService] = useState<any | null>(null);
  const [totalScheduledCount, setTotalScheduledCount] = useState<number>(0);
  const [startingServiceId, setStartingServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (refreshData) refreshData();
    const fetchAlerts = async () => {
      try {
        const res: any = await api.get('/api/rider/notifications');
        if (res?.success && Array.isArray(res.notifications)) {
          const unread = res.notifications.filter((n: any) => !n.isRead);
          setActiveAlerts(unread.slice(0, 2));
        }
      } catch {}
    };

    const fetchScheduled = async () => {
      try {
        const res: any = await api.get('/api/rider/orders/scheduled-services').catch(() => api.get('/api/rider/scheduled-services'));
        if (res?.success) {
          const allServices = res.services || [];
          setTotalScheduledCount(res.totalCount ?? allServices.length);
          const todayList = res.grouped?.today || [];

          // Current IST time calculation
          const nowIST = new Date(Date.now() + 5.5 * 3600 * 1000);
          const currentHour = nowIST.getUTCHours();
          const currentMinutes = nowIST.getUTCMinutes();
          const currentTimeDec = currentHour + currentMinutes / 60;

          // Find if any job today is starting in ~1-2 hours or already underway
          const imminent = todayList.find((srv: any) => {
            const slotStr = srv.order?.notes || srv.pickupAddress || '';
            const startHour = parseSlotStartHour(slotStr);
            const hoursUntil = startHour - currentTimeDec;
            return hoursUntil <= 2.5 && hoursUntil >= -2.0;
          }) || (todayList.length > 0 ? todayList[0] : null);

          setImminentService(imminent || null);
        }
      } catch {}
    };

    fetchAlerts();
    fetchScheduled();
    const interval = setInterval(fetchScheduled, 30000);
    return () => clearInterval(interval);
  }, []);

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

      {/* 1 to 2 Hours Before Scheduled Service Reminder Card */}
      {imminentService && (
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg border-2 border-teal-500/80 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Doorstep Service Reminder (1–2 Hours Away)</span>
                </span>
                <span className="px-2 py-0.5 bg-teal-500/30 text-teal-200 border border-teal-400/30 rounded-full text-[10px] font-bold">
                  Ready to Dispatch
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-black text-white">
                {imminentService.pickupName}
              </h3>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-300 pt-0.5">
                <span className="font-bold text-teal-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {imminentService.order?.notes || imminentService.pickupAddress || 'Today'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[200px]">{imminentService.dropoffAddress || 'Customer Doorstep'}</span>
                </span>
                <span>•</span>
                <span className="font-black text-emerald-400 font-numbers">
                  +₹{imminentService.deliveryFee} Payout
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={async () => {
                  setStartingServiceId(imminentService.id);
                  await startServiceJob(imminentService.id);
                  setStartingServiceId(null);
                }}
                disabled={startingServiceId === imminentService.id}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                {startingServiceId === imminentService.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Heading out...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    <span>🚀 Start Navigation & Head to Site</span>
                  </>
                )}
              </button>

              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('deliveries', 'scheduled_services')}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                  title="View Scheduled Services Roster"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advance Scheduled Services Summary Pill */}
      {!imminentService && totalScheduledCount > 0 && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-xl shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-teal-950">
                You have {totalScheduledCount} Advance Service{totalScheduledCount > 1 ? 's' : ''} reserved
              </p>
              <p className="text-[11px] text-teal-800">
                We will alert you on this screen 1–2 hours before departure time.
              </p>
            </div>
          </div>
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('deliveries', 'scheduled_services')}
              className="px-3 py-1.5 bg-white text-teal-900 border border-teal-300 hover:bg-teal-100 rounded-xl font-bold text-xs shrink-0 transition-colors cursor-pointer"
            >
              View Roster
            </button>
          )}
        </div>
      )}
      
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

      {/* Fleet Broadcast Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map(alert => (
            <div
              key={alert.id}
              className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-50 border border-orange-300 rounded-2xl flex items-start justify-between gap-3 shadow-xs animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-500 text-white rounded-xl shrink-0 mt-0.5 shadow-sm shadow-orange-500/20">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-orange-950 uppercase tracking-wide">
                      {alert.title}
                    </span>
                    <span className="text-[10px] bg-orange-200/90 text-orange-900 font-bold px-2 py-0.2 rounded-full border border-orange-300">
                      Announcement
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed font-medium">
                    {alert.message}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.put(`/api/rider/notifications/${alert.id}/read`, {});
                    setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
                  } catch {}
                }}
                className="text-[11px] font-bold text-orange-800 hover:text-orange-950 bg-white/90 border border-orange-300 hover:bg-orange-100 px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cash in Hand Statement Card */}
      {((profile?.codCashFloat ?? 0) > 0 || (profile?.walletBalance ?? 0) < 0) && (
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 bg-gradient-to-r from-amber-50 to-orange-50 border-orange-300 text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl border shadow-xs shrink-0 bg-orange-500 text-white border-orange-600">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-black uppercase tracking-tight">
                  Offline Cash Kept: ₹{(profile?.codCashFloat ?? 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] bg-amber-200/90 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  Kept in Pocket
                </span>
                {(profile?.walletBalance ?? 0) < 0 && (
                  <span className="text-[10px] bg-red-100 text-red-800 font-black px-2 py-0.5 rounded-full border border-red-200">
                    Wallet: -₹{Math.abs(Math.round(profile?.walletBalance || 0)).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 mt-1.5 font-medium leading-relaxed">
                You collected and kept this offline customer cash. If your wallet balance is insufficient to clear it, please <strong>complete more delivery rides</strong> to earn delivery fees and clear this balance. If your negative balance is not cleared or exceeds the float limit, <strong>future ride assignments will be paused and your account will be suspended</strong>.
              </p>
            </div>
          </div>

          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('deliveries', 'trips')}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              title="View Delivery Trips & Statements"
            >
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>View Statement</span>
            </button>
          )}
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
        {/* Wallet Balance (Auto-Offset Model) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Wallet Balance</span>
            <div className={`p-1.5 rounded-lg ${
              (profile?.walletBalance || 0) < 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black ${
            (profile?.walletBalance || 0) < 0 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {(profile?.walletBalance || 0) < 0
              ? `-₹${Math.abs(Math.round(profile?.walletBalance || 0)).toLocaleString('en-IN')}`
              : `₹${Math.round(profile?.walletBalance || 0).toLocaleString('en-IN')}`}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {(profile?.walletBalance || 0) < 0
              ? `Holds ₹${Math.round(profile?.codCashFloat || 0)} cash • Offsets next trips`
              : 'Instant withdrawable'}
          </span>
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
