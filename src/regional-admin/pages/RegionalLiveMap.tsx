import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin,
  Bike,
  Package,
  Navigation,
  RefreshCw,
  Store,
  ExternalLink,
  RotateCcw,
  Clock,
} from 'lucide-react';

export const RegionalLiveMap: React.FC = () => {
  const { token } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [shiprocketShipments, setShiprocketShipments] = useState<any[]>([]);
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
        setShiprocketShipments(data.shiprocketShipments || []);
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
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Live Regional Dispatch Radar</h2>
          <p className="text-xs text-slate-400">
            Real-time tracking of active quick-commerce trips, online fleet, and 3PL courier pickups
          </p>
        </div>

        <button
          onClick={fetchLive}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Radar</span>
        </button>
      </div>

      {/* Visual Live Map Grid Canvas */}
      <div className="relative w-full h-80 sm:h-96 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center">
        {/* Dynamic Map Coordinate Canvas Grid */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        {/* Territory Radar Ring Lines */}
        <div className="absolute w-72 h-72 rounded-full border border-blue-500/10 animate-ping pointer-events-none" />
        <div className="absolute w-96 h-96 rounded-full border border-blue-500/20 pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full border border-blue-500/30 pointer-events-none" />

        {/* Territory Center Hub */}
        <div className="relative z-10 p-3 rounded-2xl bg-blue-600/30 border border-blue-400 text-white shadow-xl backdrop-blur-md flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-300" />
          <span className="text-xs font-bold">Regional Operations Hub</span>
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
              <div className="p-2 rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-950/60 animate-bounce">
                <Bike className="w-4 h-4" />
              </div>
              <span className="mt-1 text-[10px] font-bold text-emerald-300 bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-500/30 shadow">
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
              <div className="p-2 rounded-full bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/40 ring-4 ring-orange-950/60 animate-pulse">
                <Package className="w-4 h-4" />
              </div>
              <span className="mt-1 text-[10px] font-bold text-orange-300 bg-slate-900/90 px-2 py-0.5 rounded border border-orange-500/30 shadow">
                #{del.order?.orderNumber || del.id.slice(0, 6)}
              </span>
            </div>
          );
        })}

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 backdrop-blur-md flex items-center gap-4 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Online Rider</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Active Quick Order</span>
          </div>
        </div>
      </div>

      {/* Active Trips Dispatch Oversight Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" /> Active Quick-Commerce In-Transit Oversight
        </h3>

        {deliveries.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No active trips currently in transit.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {deliveries.map((del) => (
              <div key={del.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">
                      #{del.order?.orderNumber || del.id.slice(0, 8)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        del.status === 'broadcasted'
                          ? 'bg-orange-950 text-orange-400 border border-orange-500/30'
                          : 'bg-blue-950 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {del.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-orange-400" />
                    <span>{del.pickupName}</span>
                    <span className="text-slate-600">➔</span>
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{del.dropoffName}</span>
                  </p>

                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Assigned Partner: <strong className="text-white">{del.riderProfile?.user?.name || 'Searching Nearby Partner...'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEmergencyReassign(del.id)}
                    disabled={reassigningId === del.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all"
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
