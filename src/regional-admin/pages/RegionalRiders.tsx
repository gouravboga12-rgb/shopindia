import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  Star,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { getSkillLabel } from '../../data/partnerSkills';

interface RiderItem {
  id: string;
  partnerType?: 'delivery' | 'service' | 'both' | string;
  skills?: string[];
  experienceYears?: number;
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
  const [activeTab, setActiveTab] = useState<'all' | 'delivery' | 'service' | 'both' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredRiders = riders.filter((r) => {
    // Tab filter
    if (activeTab === 'pending' && r.isApproved) return false;
    if (activeTab === 'delivery' && r.partnerType !== 'delivery') return false;
    if (activeTab === 'service' && r.partnerType !== 'service') return false;
    if (activeTab === 'both' && r.partnerType !== 'both') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.user.name?.toLowerCase().includes(q);
      const matchEmail = r.user.email?.toLowerCase().includes(q);
      const matchPhone = r.user.phone?.includes(q);
      const matchSkill = r.skills?.some((s) => s.toLowerCase().includes(q));
      return matchName || matchEmail || matchPhone || matchSkill;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Territory Fleet & Service Network</h2>
          <p className="text-xs text-slate-400">
            Review partner KYC documents, verify service skill qualifications, and manage dispatch capabilities
          </p>
        </div>

        <button
          onClick={fetchRiders}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-base">{rider.user.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 capitalize">
                        {rider.partnerType === 'both' ? '⚡ All-Rounder' : rider.partnerType === 'service' ? '🛠️ Service Pro' : '🚚 Delivery'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{rider.user.email} • {rider.user.phone}</p>
                    {rider.vehicleNumber ? (
                      <p className="text-xs text-amber-400/90 font-mono mt-1">
                        Vehicle: {rider.vehicleType.toUpperCase()} ({rider.vehicleNumber})
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-1">No vehicle registered (Service Partner)</p>
                    )}
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                    Awaiting Review
                  </span>
                </div>

                {/* Skills tags if service or both */}
                {rider.skills && rider.skills.length > 0 && (
                  <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-orange-400" /> Applied Service Skills ({rider.skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {rider.skills.map((skillId) => (
                        <span
                          key={skillId}
                          className="text-[10px] bg-orange-950/70 border border-orange-500/30 text-orange-300 px-2 py-0.5 rounded-md"
                        >
                          {getSkillLabel(skillId)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div><span className="text-slate-500">DL:</span> {rider.licenseNumber || 'Not submitted / NA'}</div>
                  <div><span className="text-slate-500">Aadhaar:</span> {rider.aadhaarNumber || 'Submitted'}</div>
                  <div><span className="text-slate-500">PAN:</span> {rider.panNumber || 'Submitted'}</div>
                  {rider.experienceYears && (
                    <div><span className="text-slate-500">Experience:</span> {rider.experienceYears} Years</div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleVerify(rider.id, true)}
                    disabled={actionLoading === rider.id}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Partner</span>
                  </button>
                  <button
                    onClick={() => handleVerify(rider.id, false)}
                    disabled={actionLoading === rider.id}
                    className="py-2 px-3 bg-red-950 hover:bg-red-900 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fleet Controls: Search & Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Partners ({riders.length})
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'delivery'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🚚 Delivery ({riders.filter((r) => r.partnerType === 'delivery').length})
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'service'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛠️ Service Pros ({riders.filter((r) => r.partnerType === 'service').length})
            </button>
            <button
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'both'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚡ All-Rounder ({riders.filter((r) => r.partnerType === 'both').length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              Pending ({pendingVerification.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search partner or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Fleet Grid */}
        {filteredRiders.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            No partners found matching the active filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredRiders.map((rider) => (
              <div
                key={rider.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-600 transition-colors"
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
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          rider.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      {rider.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>

                    <span className="text-xs text-amber-400 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {rider.rating.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{rider.user.name}</h4>
                      <p className="text-xs text-slate-400">{rider.user.phone}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                      {rider.partnerType === 'both' ? '⚡ All-Rounder' : rider.partnerType === 'service' ? '🛠️ Service' : '🚚 Delivery'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    {rider.vehicleNumber ? `${rider.vehicleType.toUpperCase()} • Radius: ${rider.serviceRadiusKm} km` : `Radius: ${rider.serviceRadiusKm} km`}
                  </p>

                  {/* Skills tags */}
                  {rider.skills && rider.skills.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-1">
                      {rider.skills.slice(0, 4).map((skillId) => (
                        <span
                          key={skillId}
                          className="text-[9px] bg-slate-900 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                        >
                          {getSkillLabel(skillId)}
                        </span>
                      ))}
                      {rider.skills.length > 4 && (
                        <span className="text-[9px] bg-slate-900 text-slate-400 px-1 py-0.5 rounded">
                          +{rider.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Deliveries / Jobs:</span>
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
