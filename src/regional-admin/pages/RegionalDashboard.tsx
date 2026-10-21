import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Globe2,
  Bike,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Truck,
} from 'lucide-react';

interface RegionalMetrics {
  activeDeliveries: number;
  onlineRidersCount: number;
  totalRegionalRiders: number;
  pendingApprovalRiders: number;
  regionalGmv: number;
  totalOrdersCount: number;
}

export const RegionalDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [metrics, setMetrics] = useState<RegionalMetrics>({
    activeDeliveries: 0,
    onlineRidersCount: 0,
    totalRegionalRiders: 0,
    pendingApprovalRiders: 0,
    regionalGmv: 0,
    totalOrdersCount: 0,
  });
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/regional-admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {});
        setRecentDeliveries(data.recentDeliveries || []);
      }
    } catch (e) {
      console.error('Regional dashboard error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-200">
      
      {/* Territory Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400">
            <Globe2 className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-wider">Territory Operational Command</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">
            Regional Control: {user?.name || 'Hub Manager'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time quick-commerce fleet, merchant dispatches, and Shiprocket 3PL performance
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Pulse</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Deliveries */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Deliveries</span>
            <Bike className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-400">
            {metrics.activeDeliveries}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Live in-transit orders</span>
        </div>

        {/* Online Riders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Online Riders</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">READY</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {metrics.onlineRidersCount}{' '}
            <span className="text-sm font-normal text-slate-500">/ {metrics.totalRegionalRiders}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Available for broadcasts</span>
        </div>

        {/* Regional GMV */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Regional Sales GMV</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            ₹{metrics.regionalGmv.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Across local merchants</span>
        </div>

        {/* KYC Verification Pending */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">KYC Approvals Queue</span>
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {metrics.pendingApprovalRiders}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Awaiting partner verification</span>
        </div>
      </div>

      {/* Recent Regional Deliveries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-400" /> Live Regional Deliveries
        </h3>

        {recentDeliveries.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No active deliveries currently in this zone.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3 rounded-l-xl">Order</th>
                  <th className="p-3">Pickup & Dropoff</th>
                  <th className="p-3">Assigned Rider</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-r-xl">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-white">
                      #{del.order?.orderNumber || del.id.slice(0, 8)}
                    </td>
                    <td className="p-3">
                      <div className="text-slate-200 font-medium truncate max-w-[180px]">{del.pickupName}</div>
                      <div className="text-slate-500 text-[11px] truncate max-w-[180px]">➔ {del.dropoffName}</div>
                    </td>
                    <td className="p-3">
                      {del.riderProfile ? (
                        <div>
                          <span className="font-semibold text-white">{del.riderProfile.user?.name}</span>
                          <span className="block text-[10px] text-slate-500 uppercase">{del.riderProfile.vehicleType}</span>
                        </div>
                      ) : (
                        <span className="text-orange-400 text-[11px] italic font-medium">Broadcasted (Claiming)</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          del.status === 'delivered'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : del.status === 'broadcasted'
                            ? 'bg-orange-950 text-orange-400 border border-orange-500/30 animate-pulse'
                            : 'bg-blue-950 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {del.status}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-400">
                      ₹{del.deliveryFee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
