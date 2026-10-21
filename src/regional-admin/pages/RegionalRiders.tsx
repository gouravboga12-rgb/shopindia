import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bike, CheckCircle2, Star, AlertCircle, RefreshCw } from 'lucide-react';

interface RiderItem {
  id: string;
  vehicleType: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  isOnline: boolean;
  isApproved: boolean;
  isActive: boolean;
  walletBalance: number;
  totalDeliveries: number;
  rating: number;
  serviceRadiusKm: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  _count?: {
    deliveries: number;
  };
}

export const RegionalRiders: React.FC = () => {
  const { token } = useAuth();
  const [riders, setRiders] = useState<RiderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRiders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/regional-admin/riders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRiders(data.riders || []);
      }
    } catch (e) {
      console.error('Failed to fetch regional riders', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, [token]);

  const handleVerify = async (riderId: string, approve: boolean) => {
    if (!token) return;
    setActionLoading(riderId);
    try {
      const res = await fetch(`/api/regional-admin/riders/${riderId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: approve }),
      });
      if (res.ok) {
        setRiders((prev) =>
          prev.map((r) => (r.id === riderId ? { ...r, isApproved: approve, isActive: approve } : r))
        );
      }
    } catch (e) {
      console.error('Failed to verify rider', e);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingVerification = riders.filter((r) => !r.isApproved);
  const approvedRiders = riders.filter((r) => r.isApproved);

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Territory Delivery Fleet</h2>
          <p className="text-xs text-slate-400">
            Review partner KYC documents, verify background checks, and monitor live fleet status
          </p>
        </div>

        <button
          onClick={fetchRiders}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* KYC Approvals Queue (Priority Alert) */}
      {pendingVerification.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Pending KYC Verification ({pendingVerification.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingVerification.map((rider) => (
              <div
                key={rider.id}
                className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 shadow-md space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">{rider.user.name}</h4>
                    <p className="text-xs text-slate-400">{rider.user.email} • {rider.user.phone}</p>
                    <p className="text-xs text-amber-400/90 font-mono mt-1">
                      Vehicle: {rider.vehicleType.toUpperCase()} ({rider.vehicleNumber || 'Unregistered'})
                    </p>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                    Awaiting Verification
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div><span className="text-slate-500">DL:</span> {rider.licenseNumber || 'Submitted'}</div>
                  <div><span className="text-slate-500">Aadhaar:</span> {rider.aadhaarNumber || 'Submitted'}</div>
                  <div><span className="text-slate-500">PAN:</span> {rider.panNumber || 'Submitted'}</div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleVerify(rider.id, true)}
                    disabled={actionLoading === rider.id}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve KYC</span>
                  </button>
                  <button
                    onClick={() => handleVerify(rider.id, false)}
                    disabled={actionLoading === rider.id}
                    className="py-2 px-3 bg-red-950 hover:bg-red-900 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Fleet Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Bike className="w-5 h-5 text-emerald-400" /> Active Verified Fleet ({approvedRiders.length})
        </h3>

        {approvedRiders.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No approved delivery partners in this zone yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedRiders.map((rider) => (
              <div
                key={rider.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                        rider.isOnline
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${rider.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {rider.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>

                    <span className="text-xs text-amber-400 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {rider.rating.toFixed(1)}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm">{rider.user.name}</h4>
                  <p className="text-xs text-slate-400">{rider.user.phone}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {rider.vehicleType.toUpperCase()} • Radius: {rider.serviceRadiusKm} km
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Lifetime Deliveries:</span>
                  <span className="font-bold text-white">{rider.totalDeliveries}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
