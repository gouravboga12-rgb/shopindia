import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin,
  Bike,
  Package,
  Navigation,
  RefreshCw,
  Store,
  RotateCcw,
} from 'lucide-react';

export const RegionalLiveMap: React.FC = () => {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  const fetchLive = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/regional-admin/deliveries/live', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        setOnlineRiders(data.onlineRiders || []);
      }
    } catch (e) {
      console.error('Failed to fetch live regional map data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [token]);

  const handleEmergencyReassign = async (deliveryId: string) => {
    if (!token) return;
    setReassigningId(deliveryId);
    try {
      const res = await fetch(`/api/regional-admin/deliveries/${deliveryId}/reassign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchLive();
      }
    } catch (e) {
      console.error('Failed to reassign delivery', e);
    } finally {
      setReassigningId(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 text-slate-800 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Live Dispatch Radar</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time tracking of active quick-commerce trips, online fleet, and 3PL pickups
          </p>
        </div>

        <button
          onClick={fetchLive}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Sync Radar</span>
        </button>
      </div>

      {/* Visual Live Map Grid Canvas */}
      <div className="relative w-full h-80 sm:h-96 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-blue-50/40 via-white to-slate-50 border border-slate-200/90 shadow-xs overflow-hidden flex items-center justify-center">
        {/* Dynamic Map Coordinate Canvas Grid */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        {/* Territory Radar Ring Lines */}
        <div className="absolute w-72 h-72 rounded-full border border-blue-400/20 animate-ping pointer-events-none" />
        <div className="absolute w-96 h-96 rounded-full border border-blue-400/30 pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full border border-blue-500/40 pointer-events-none" />

        {/* Territory Center Hub */}
        <div className="relative z-10 p-3 rounded-2xl bg-white/90 border border-blue-300 text-slate-900 shadow-md backdrop-blur-md flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600 text-white rounded-xl shadow-xs">
            <Navigation className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-blue-900">Regional Operations Hub</span>
        </div>

        {/* Overlay Online Riders Nodes */}
        {onlineRiders.slice(0, 6).map((rider, idx) => {
          const positions = [
            'top-10 left-16',
            'top-14 right-20',
            'bottom-16 left-24',
            'bottom-12 right-28',
            'top-28 left-40',
            'bottom-24 right-48',
          ];
          return (
            <div
              key={rider.id}
              className={`absolute ${positions[idx % positions.length]} z-20 flex flex-col items-center group cursor-pointer`}
            >
              <div className="p-2 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-4 ring-emerald-100 animate-bounce">
                <Bike className="w-4 h-4" />
              </div>
              <span className="mt-1 text-[10px] font-bold text-slate-800 bg-white/95 px-2 py-0.5 rounded-full border border-emerald-200 shadow-xs">
                {rider.user?.name || 'Rider'}
              </span>
            </div>
          );
        })}

        {/* Overlay Active Deliveries Nodes */}
        {deliveries.slice(0, 4).map((del, idx) => {
          const positions = ['top-20 left-1/3', 'bottom-20 right-1/3', 'top-1/3 right-16', 'bottom-1/3 left-16'];
          return (
            <div
              key={del.id}
              className={`absolute ${positions[idx % positions.length]} z-20 flex flex-col items-center group cursor-pointer`}
            >
              <div className="p-2 rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-4 ring-orange-100 animate-pulse">
                <Package className="w-4 h-4" />
              </div>
              <span className="mt-1 text-[10px] font-bold text-orange-700 bg-white/95 px-2 py-0.5 rounded-full border border-orange-200 shadow-xs">
                #{del.order?.orderNumber || del.id.slice(0, 6)}
              </span>
            </div>
          );
        })}

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 bg-white/95 border border-slate-200 rounded-xl p-2 sm:p-2.5 backdrop-blur-md flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-slate-700 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-medium">Online Fleet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="font-medium">Active Quick Order</span>
          </div>
        </div>
      </div>

      {/* Active Trips Dispatch Oversight Cards */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" /> Active Quick-Commerce In-Transit Oversight
        </h3>

        {deliveries.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium">No active trips currently in transit.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deliveries.map((del) => (
              <div key={del.id} className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-sm">
                      #{del.order?.orderNumber || del.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        del.status === 'broadcasted'
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {del.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-1 flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="font-medium">{del.pickupName}</span>
                    <span className="text-slate-400">➔</span>
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium">{del.dropoffName}</span>
                  </p>

                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Assigned Partner: <strong className="text-slate-900">{del.riderProfile?.user?.name || 'Searching Nearby Partner...'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleEmergencyReassign(del.id)}
                    disabled={reassigningId === del.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${reassigningId === del.id ? 'animate-spin' : ''}`} />
                    <span>Re-Broadcast Job</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
