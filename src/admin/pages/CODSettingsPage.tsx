import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Banknote,
  ShieldAlert,
  Clock,
  Layers,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Check,
  Search,
  Bike
} from 'lucide-react';

interface CODSettings {
  deadlineRule: 'end_of_day' | 'order_count';
  orderCountThreshold: number;
  maxFloatLimit: number;
  allowRegionalCash: boolean;
  autoPauseRider: boolean;
}

interface MonitoredRider {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  branch: string;
  codCashFloat: number;
  codFloatLimit: number;
  unremittedDeliveriesCount: number;
  complianceStatus: 'compliant' | 'warning' | 'overdue_paused';
  reason: string;
  isOnline: boolean;
  isActive: boolean;
}

export const CODSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CODSettings>({
    deadlineRule: 'end_of_day',
    orderCountThreshold: 3,
    maxFloatLimit: 3000,
    allowRegionalCash: true,
    autoPauseRider: true,
  });

  const [riders, setRiders] = useState<MonitoredRider[]>([]);
  const [totalFloatingCash, setTotalFloatingCash] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'compliant' | 'warning' | 'overdue_paused'>('all');

  // Manual Clearance Modal
  const [selectedRider, setSelectedRider] = useState<MonitoredRider | null>(null);
  const [clearNotes, setClearNotes] = useState<string>('');
  const [clearing, setClearing] = useState<boolean>(false);

  const fetchSettingsAndRiders = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [settingsRes, ridersRes] = await Promise.all([
        api.get<{ success: boolean; settings: CODSettings }>('/api/admin/cod-settings'),
        api.get<{
          success: boolean;
          totalFloatingCash: number;
          deadlineRule: string;
          riders: MonitoredRider[];
        }>('/api/admin/cod-settings/riders'),
      ]);

      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
      if (ridersRes.success && ridersRes.riders) {
        setRiders(ridersRes.riders);
        setTotalFloatingCash(ridersRes.totalFloatingCash || 0);
      }
    } catch (err: unknown) {
      console.error('Failed to load COD settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch COD clearance settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndRiders();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const res = await api.post<{ success: boolean; message: string }>('/api/admin/cod-settings', settings);
      if (res.success) {
        setSaveSuccess('COD clearance rules successfully updated and enforced platform-wide!');
        setTimeout(() => setSaveSuccess(null), 4000);
        // Refresh riders view with updated thresholds
        await fetchSettingsAndRiders();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleForceClear = async () => {
    if (!selectedRider) return;
    setClearing(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/api/admin/cod-settings/riders/${selectedRider.id}/force-clear`,
        { notes: clearNotes }
      );
      if (res.success) {
        setSelectedRider(null);
        setClearNotes('');
        await fetchSettingsAndRiders();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to clear rider float');
    } finally {
      setClearing(false);
    }
  };

  const filteredRiders = riders.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm) ||
      r.branch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.complianceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const compliantCount = riders.filter((r) => r.complianceStatus === 'compliant').length;
  const warningCount = riders.filter((r) => r.complianceStatus === 'warning').length;
  const overdueCount = riders.filter((r) => r.complianceStatus === 'overdue_paused').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-heading">
                COD Clearance Engine & Float Management
              </h1>
              <p className="text-sm text-slate-500">
                Configure dynamic clearance rules, cash float limits, and monitor real-time cash custody held across the delivery fleet.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchSettingsAndRiders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-medium flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-medium flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Floating Cash Fleet Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Fleet Cash in Hand</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            ₹{totalFloatingCash.toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">Held across {riders.length} active riders</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Compliant Riders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2 font-mono">{compliantCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Within float limits & rules</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Approaching Limit</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2 font-mono">{warningCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">&gt; 75% of cash float limit</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Overdue / Paused</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600 mt-2 font-mono">{overdueCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Dispatch radar blocked</span>
        </div>
      </div>

      {/* Configuration Form Card */}
      <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            COD Clearance Rules & Platform Policies
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define mandatory remittance cycles and cash custody thresholds before rider orders are held.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Rule 1: Clearance Deadline Rule */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Remittance Deadline Policy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                  settings.deadlineRule === 'end_of_day'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold">End of the Day</span>
                  </div>
                  <input
                    type="radio"
                    name="deadlineRule"
                    checked={settings.deadlineRule === 'end_of_day'}
                    onChange={() => setSettings({ ...settings, deadlineRule: 'end_of_day' })}
                    className="accent-emerald-600"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 font-normal">
                  Rider may collect COD orders throughout the day, but must clear cash before midnight to resume next-day dispatches.
                </p>
              </label>

              <label
                className={`p-4 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                  settings.deadlineRule === 'order_count'
                    ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold">Next 2 or 3 Orders</span>
                  </div>
                  <input
                    type="radio"
                    name="deadlineRule"
                    checked={settings.deadlineRule === 'order_count'}
                    onChange={() => setSettings({ ...settings, deadlineRule: 'order_count' })}
                    className="accent-emerald-600"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 font-normal">
                  Requires immediate clearance after completing consecutive unremitted COD deliveries.
                </p>
              </label>
            </div>

            {/* If Order Count is selected, allow 2 or 3 */}
            {settings.deadlineRule === 'order_count' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Max Consecutive COD Deliveries</span>
                  <p className="text-[11px] text-slate-500">Order threshold before auto-pause triggers</p>
                </div>
                <div className="flex items-center gap-2">
                  {[2, 3].map((count) => (
                    <button
                      type="button"
                      key={count}
                      onClick={() => setSettings({ ...settings, orderCountThreshold: count })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        settings.orderCountThreshold === count
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {count} Orders
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rule 2: Float Limit & Dispatch Controls */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Floating Cash Limit & Safeguards
            </label>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600 font-semibold">Maximum Floating Cash Limit (₹)</span>
                <span className="text-xs font-mono font-bold text-emerald-600">₹{settings.maxFloatLimit}</span>
              </div>
              <input
                type="number"
                min={500}
                max={20000}
                step={500}
                value={settings.maxFloatLimit}
                onChange={(e) => setSettings({ ...settings, maxFloatLimit: Number(e.target.value) || 3000 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
              />
              <div className="flex gap-2 mt-2">
                {[1500, 3000, 5000].map((amt) => (
                  <button
                    type="button"
                    key={amt}
                    onClick={() => setSettings({ ...settings, maxFloatLimit: amt })}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-mono transition-colors ${
                      settings.maxFloatLimit === amt
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle 1: Auto-Pause Dispatch */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800">Auto-Pause Rider Radar</span>
                <p className="text-[11px] text-slate-500">Temporarily prevent dispatches when limit exceeded</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPauseRider}
                onChange={(e) => setSettings({ ...settings, autoPauseRider: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Toggle 2: Regional Admin Physical Handover */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-800">Physical Cash Handover Option</span>
                <p className="text-[11px] text-slate-500">Allow submission to Regional Admin if active in territory</p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowRegionalCash}
                onChange={(e) => setSettings({ ...settings, allowRegionalCash: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save COD Clearance Settings</span>
          </button>
        </div>
      </form>

      {/* Monitored Fleet Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bike className="w-5 h-5 text-slate-700" />
              Live Fleet Cash Custody & Compliance Monitor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time monitoring of all delivery personnel holding customer cash-on-delivery payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rider, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white w-48 sm:w-60"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600"
            >
              <option value="all">All Statuses ({riders.length})</option>
              <option value="compliant">Compliant ({compliantCount})</option>
              <option value="warning">Warning ({warningCount})</option>
              <option value="overdue_paused">Overdue / Paused ({overdueCount})</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Rider / Partner</th>
                <th className="py-3 px-4">Territory / Branch</th>
                <th className="py-3 px-4">Cash in Hand</th>
                <th className="py-3 px-4">Float Limit</th>
                <th className="py-3 px-4">Unremitted Orders</th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRiders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No riders found matching the current search filters.
                  </td>
                </tr>
              ) : (
                filteredRiders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{rider.name}</span>
                          {rider.isOnline && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Online" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{rider.email}</div>
                        <div className="text-[11px] text-slate-400">{rider.phone}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rider.branch}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`font-mono font-bold text-sm ${
                        rider.codCashFloat > 0 ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        ₹{rider.codCashFloat.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      ₹{rider.codFloatLimit.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                        {rider.unremittedDeliveriesCount} COD
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {rider.complianceStatus === 'compliant' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" /> Compliant
                        </span>
                      )}
                      {rider.complianceStatus === 'warning' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Approaching Limit
                        </span>
                      )}
                      {rider.complianceStatus === 'overdue_paused' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3 h-3" /> Paused / Overdue
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 mt-0.5">{rider.reason}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {rider.codCashFloat > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRider(rider);
                            setClearNotes(`Verified manual clearance of ₹${rider.codCashFloat}`);
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          Clear Float
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Cleared</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Super Admin Manual Clearance Modal */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Banknote className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Manual Cash Clearance</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRider(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Clear the offline COD cash float for <strong className="text-slate-800">{selectedRider.name}</strong>. This writes an immutable DEBIT entry to the general ledger and immediately unblocks rider dispatches.
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Rider:</span>
                <span className="font-semibold text-slate-800">{selectedRider.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">{selectedRider.email}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Current Floating Cash:</span>
                <span className="font-mono font-bold text-emerald-600">₹{selectedRider.codCashFloat}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Notes / Clearance Reason
              </label>
              <textarea
                rows={2}
                value={clearNotes}
                onChange={(e) => setClearNotes(e.target.value)}
                placeholder="e.g. Received direct bank transfer UTR #12345678"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRider(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={handleForceClear}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {clearing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Post Ledger Clearance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
