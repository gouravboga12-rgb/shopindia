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
  isRejected?: boolean;
  walletBalance: number;
  totalDeliveries: number;
  rating: number;
  serviceRadiusKm: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status?: string;
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
  const [activeTab, setActiveTab] = useState<'all' | 'delivery' | 'service' | 'both' | 'pending' | 'rejected'>('all');
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
          prev.map((r) =>
            r.id === riderId
              ? {
                  ...r,
                  isApproved: approve,
                  isActive: approve,
                  isRejected: !approve,
                  user: { ...r.user, status: approve ? 'active' : 'rejected' },
                }
              : r
          )
        );
      }
    } catch (e) {
      console.error('Failed to verify rider', e);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingVerification = riders.filter(
    (r) => !r.isApproved && !r.isRejected && r.user?.status !== 'rejected' && r.isActive !== false
  );

  const filteredRiders = riders.filter((r) => {
    const isRiderRejected = r.isRejected || r.user?.status === 'rejected' || (!r.isApproved && !r.isActive);

    // Tab filter
    if (activeTab === 'rejected') return isRiderRejected;
    if (isRiderRejected && activeTab !== 'all') return false;

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
    <div className="space-y-5 sm:space-y-6 text-slate-800 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Territory Fleet & Service Network</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review partner KYC documents, verify service qualifications, and monitor dispatch capabilities
          </p>
        </div>

        <button
          onClick={fetchRiders}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold border border-blue-200 transition-colors shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* KYC Approvals Queue (Priority Alert) */}
      {pendingVerification.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Pending KYC Verification ({pendingVerification.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingVerification.map((rider) => (
              <div
                key={rider.id}
                className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{rider.user.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 capitalize">
                        {rider.partnerType === 'both' ? '⚡ All-Rounder' : rider.partnerType === 'service' ? '🛠️ Service Pro' : '🚚 Delivery'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{rider.user.email} • {rider.user.phone}</p>
                    {rider.vehicleNumber ? (
                      <p className="text-xs text-amber-700 font-mono mt-1 font-medium">
                        Vehicle: {rider.vehicleType.toUpperCase()} ({rider.vehicleNumber})
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-1">No vehicle registered (Service Partner)</p>
                    )}
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                    Awaiting Review
                  </span>
                </div>

                {/* Skills tags if service or both */}
                {rider.skills && rider.skills.length > 0 && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600" /> Applied Service Skills ({rider.skills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {rider.skills.map((skillId) => (
                        <span
                          key={skillId}
                          className="text-[10px] bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-medium shadow-2xs"
                        >
                          {getSkillLabel(skillId)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                  <div><span className="text-slate-400 font-medium">DL:</span> {rider.licenseNumber || 'Not submitted / NA'}</div>
                  <div><span className="text-slate-400 font-medium">Aadhaar:</span> {rider.aadhaarNumber || 'Submitted'}</div>
                  <div><span className="text-slate-400 font-medium">PAN:</span> {rider.panNumber || 'Submitted'}</div>
                  {rider.experienceYears && (
                    <div><span className="text-slate-400 font-medium">Experience:</span> {rider.experienceYears} Years</div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleVerify(rider.id, true)}
                    disabled={actionLoading === rider.id}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Partner</span>
                  </button>
                  <button
                    onClick={() => handleVerify(rider.id, false)}
                    disabled={actionLoading === rider.id}
                    className="py-2 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
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
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs - horizontally scrollable on mobile */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Partners ({riders.length})
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'delivery'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🚚 Delivery ({riders.filter((r) => r.partnerType === 'delivery').length})
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'service'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛠️ Service Pros ({riders.filter((r) => r.partnerType === 'service').length})
            </button>
            <button
              onClick={() => setActiveTab('both')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'both'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ All-Rounder ({riders.filter((r) => r.partnerType === 'both').length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              Pending ({pendingVerification.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-red-600 hover:text-red-900'
              }`}
            >
              Rejected ({riders.filter((r) => r.isRejected || r.user?.status === 'rejected' || (!r.isApproved && !r.isActive)).length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search partner or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Fleet Grid */}
        {filteredRiders.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium">
              No partners found matching the active filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-2">
            {filteredRiders.map((rider) => (
              <div
                key={rider.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-blue-300 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                        rider.isOnline
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          rider.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {rider.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>

                    <span className="text-xs text-amber-600 font-bold flex items-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {rider.rating.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{rider.user.name}</h4>
                      <p className="text-xs text-slate-500">{rider.user.phone}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                      {rider.partnerType === 'both' ? '⚡ All-Rounder' : rider.partnerType === 'service' ? '🛠️ Service' : '🚚 Delivery'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {rider.vehicleNumber ? `${rider.vehicleType.toUpperCase()} • Radius: ${rider.serviceRadiusKm} km` : `Radius: ${rider.serviceRadiusKm} km`}
                  </p>

                  {/* Skills tags */}
                  {rider.skills && rider.skills.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {rider.skills.slice(0, 4).map((skillId) => (
                        <span
                          key={skillId}
                          className="text-[9px] bg-slate-50 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium"
                        >
                          {getSkillLabel(skillId)}
                        </span>
                      ))}
                      {rider.skills.length > 4 && (
                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-medium">
                          +{rider.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Deliveries / Jobs:</span>
                  <span className="font-bold text-slate-900">{rider.totalDeliveries}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
