import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Bike,
  Phone,
  MessageCircle,
  BellRing,
  Edit3,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  X,
  Wallet,
} from 'lucide-react';

interface RecentDelivery {
  id: string;
  orderNumber: string;
  amount: number;
  customerName: string;
  customerPhone?: string;
  deliveredAt: string;
  address: string;
}

interface RiderItem {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehicleNumber: string;
  isOnline: boolean;
  isApproved: boolean;
  codCashFloat: number;
  codFloatLimit: number;
  floatPercent: number;
  riskLevel: 'safe' | 'warning' | 'breached';
  walletBalance: number;
  totalDeliveries: number;
  recentCODDeliveries: RecentDelivery[];
}

interface CODResponse {
  success: boolean;
  hubName: string;
  district: string;
  metrics: {
    totalFleetCashFloat: number;
    ridersHoldingCashCount: number;
    highRiskCount: number;
    compliantCount: number;
    totalTerritoryRiders: number;
    defaultFloatLimit: number;
  };
  riders: RiderItem[];
}

export const RegionalCODCollection: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CODResponse | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'holding' | 'risk' | 'compliant'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expandable deliveries per rider
  const [expandedRiderId, setExpandedRiderId] = useState<string | null>(null);

  // Edit contact modal state
  const [editingRider, setEditingRider] = useState<RiderItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [savingContact, setSavingContact] = useState<boolean>(false);

  // Alert sending state
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCODData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<CODResponse>('/api/regional-admin/cod');
      if (res.success) {
        setData(res);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch regional COD data:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error loading COD data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCODData();
  }, []);

  const handleSendAlert = async (rider: RiderItem) => {
    setSendingAlertId(rider.id);
    setErrorMessage(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/api/regional-admin/cod/riders/${rider.id}/send-alert`,
        {}
      );
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send alert');
    } finally {
      setSendingAlertId(null);
    }
  };

  const handleOpenEdit = (rider: RiderItem) => {
    setEditingRider(rider);
    setEditName(rider.name);
    setEditPhone(rider.phone);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRider) return;
    setSavingContact(true);
    setErrorMessage(null);
    try {
      const res = await api.patch<{ success: boolean; message: string; user: { name: string; phone: string } }>(
        `/api/regional-admin/cod/riders/${editingRider.id}/contact`,
        { name: editName, phone: editPhone }
      );
      if (res.success) {
        setSuccessMessage(res.message);
        setEditingRider(null);
        setTimeout(() => setSuccessMessage(null), 4000);
        await fetchCODData();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update contact');
    } finally {
      setSavingContact(false);
    }
  };

  const ridersList = data?.riders || [];

  // Filter riders based on active tab and search query
  const filteredRiders = ridersList.filter((r) => {
    if (filterTab === 'holding' && r.codCashFloat <= 0) return false;
    if (filterTab === 'risk' && r.riskLevel === 'safe') return false;
    if (filterTab === 'compliant' && r.codCashFloat > 0) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.name.toLowerCase().includes(q);
      const matchPhone = r.phone.toLowerCase().includes(q);
      const matchVehicle = r.vehicleNumber.toLowerCase().includes(q);
      const matchEmail = r.email.toLowerCase().includes(q);
      return matchName || matchPhone || matchVehicle || matchEmail;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200/80 shadow-2xs">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Rider Cash & COD Float Monitoring Hub
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Territory fleet cash-in-hand oversight, safety limit tracking, clearance alerts, and rider contact management.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCODData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Hub</span>
        </button>
      </div>

      {/* ─── Toast Notifications ───────────────────────────────────── */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-semibold flex items-center gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ─── 4 Territory Metric Summary Cards ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fleet COD Cash Held */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-3xl shadow-sm border border-blue-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between text-white/70 text-xs font-bold uppercase tracking-wider">
            <span>Fleet Cash in Hand</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black mt-2 font-mono text-emerald-300">
            ₹{(data?.metrics?.totalFleetCashFloat || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="text-[11px] text-white/60 mt-1 flex items-center gap-1 font-medium">
            <span>Hub: {data?.hubName || 'Regional Hub'}</span>
          </div>
        </div>

        {/* Card 2: Riders Holding Cash */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Riders Holding Cash</span>
            <Bike className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2 font-mono">
            {data?.metrics?.ridersHoldingCashCount || 0}
            <span className="text-xs text-slate-400 font-sans font-normal ml-1.5">
              / {data?.metrics?.totalTerritoryRiders || 0} active
            </span>
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Active cash floats to monitor</span>
        </div>

        {/* Card 3: High Risk / Breached Float */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>High Risk / Breached</span>
            <AlertTriangle className={`w-4 h-4 ${(data?.metrics?.highRiskCount || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
          <p className={`text-3xl font-black mt-2 font-mono ${(data?.metrics?.highRiskCount || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {data?.metrics?.highRiskCount || 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {(data?.metrics?.highRiskCount || 0) > 0 ? 'Exceeding 80% float limit' : 'All riders within safety limit'}
          </span>
        </div>

        {/* Card 4: Default Safety Float Ceiling */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Safety Float Ceiling</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-800 mt-2 font-mono">
            ₹{(data?.metrics?.defaultFloatLimit || 3000).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Max float before assignment pause</span>
        </div>
      </div>

      {/* ─── Filter Tabs & Search Bar ──────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'all', label: `All Riders (${ridersList.length})` },
            { id: 'holding', label: `Holding Cash (${data?.metrics?.ridersHoldingCashCount || 0})` },
            { id: 'risk', label: `High Risk (${data?.metrics?.highRiskCount || 0})` },
            { id: 'compliant', label: `Zero Float (${data?.metrics?.compliantCount || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by rider name, phone, vehicle..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ─── Rider Oversight Fleet Cards ───────────────────────────── */}
      {filteredRiders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-2xs">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-60" />
          <p className="text-sm font-bold text-slate-800">No riders match the current filter</p>
          <p className="text-xs text-slate-400 mt-1">All territory riders are clear or no matching contacts found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRiders.map((rider) => {
            const isExpanded = expandedRiderId === rider.id;
            const cleanPhone = (rider.phone || '').replace(/\D/g, '');
            const phoneWith91 = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
            const prefilledMsg = encodeURIComponent(
              `Hello ${rider.name}, this is Shop India Regional Operations Hub. You currently hold ₹${rider.codCashFloat.toFixed(
                2
              )} in collected COD cash. Please ensure this float is cleared promptly via your Rider App wallet to keep receiving new orders. Thank you!`
            );

            return (
              <div
                key={rider.id}
                className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow overflow-hidden"
              >
                {/* Rider Top Summary Bar */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Rider Info & Contact Details */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl border border-blue-200/80 shrink-0">
                      <Bike className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{rider.name}</h3>
                        {rider.isOnline ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Online
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Offline
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                          {rider.vehicleType.toUpperCase()} • {rider.vehicleNumber}
                        </span>
                      </div>

                      {/* Contact & Phone Display with Edit */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono text-slate-700 font-semibold flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          {rider.phone || 'No phone recorded'}
                        </span>
                        {rider.email && (
                          <span className="text-slate-400">({rider.email})</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rider)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Contact</span>
                        </button>
                      </div>

                      {/* 1-Click Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {cleanPhone && (
                          <>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors border border-blue-200 inline-flex items-center gap-1.5 shadow-2xs"
                              title="Call Rider Directly"
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-600" />
                              <span>Call</span>
                            </a>
                            <a
                              href={`https://wa.me/${phoneWith91}?text=${prefilledMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-100" />
                              <span>WhatsApp</span>
                            </a>
                          </>
                        )}

                        <button
                          type="button"
                          disabled={sendingAlertId === rider.id}
                          onClick={() => handleSendAlert(rider)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                          title="Send In-App Clearance Alert"
                        >
                          <BellRing className={`w-3.5 h-3.5 text-amber-600 ${sendingAlertId === rider.id ? 'animate-bounce' : ''}`} />
                          <span>{sendingAlertId === rider.id ? 'Sending...' : 'Send Alert'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Cash Float & Safety Limit Status */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-t lg:border-t-0 pt-3 lg:pt-0">
                    {/* Wallet Balance */}
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center gap-1 sm:justify-end">
                        <Wallet className="w-3 h-3 text-slate-400" />
                        Wallet Balance
                      </span>
                      <span className="text-sm font-black text-slate-700 font-mono">
                        ₹{rider.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Cash Float Meter */}
                    <div className="min-w-[160px] text-left sm:text-right">
                      <div className="flex items-baseline justify-between sm:justify-end gap-2">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">COD Cash Held</span>
                        {rider.riskLevel === 'breached' && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            Limit Breached
                          </span>
                        )}
                        {rider.riskLevel === 'warning' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Caution
                          </span>
                        )}
                        {rider.riskLevel === 'safe' && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Safe
                          </span>
                        )}
                      </div>

                      <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                        ₹{rider.codCashFloat.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>

                      {/* Safety Limit Progress Bar */}
                      <div className="mt-1 space-y-0.5">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full rounded-full transition-all ${
                              rider.riskLevel === 'breached'
                                ? 'bg-rose-500'
                                : rider.riskLevel === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, rider.floatPercent))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>{rider.floatPercent}% Used</span>
                          <span>Limit: ₹{rider.codFloatLimit.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Recent Delivered COD Orders */}
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setExpandedRiderId(isExpanded ? null : rider.id)}
                    className="text-slate-600 hover:text-slate-900 font-bold inline-flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <Package className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Recent COD Orders ({rider.recentCODDeliveries.length})
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <span className="text-[11px] text-slate-400">
                    {rider.totalDeliveries} total career deliveries
                  </span>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-100 divide-y divide-slate-100 text-xs">
                    {rider.recentCODDeliveries.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">No recent COD deliveries recorded for this rider.</p>
                    ) : (
                      rider.recentCODDeliveries.map((delivery) => (
                        <div key={delivery.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{delivery.orderNumber}</span>
                              <span className="text-[11px] text-slate-500 font-medium">({delivery.customerName})</span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-sm">{delivery.address}</p>
                          </div>

                          <div className="flex items-center gap-4 justify-between sm:justify-end">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(delivery.deliveredAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              ₹{delivery.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Edit Contact Modal ─────────────────────────────────────── */}
      {editingRider && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Update Rider Contact</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRider(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Rider Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Phone & WhatsApp Number (10 digits)
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Used for rider login notifications, 1-click calls, and WhatsApp reminders.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRider(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContact}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
