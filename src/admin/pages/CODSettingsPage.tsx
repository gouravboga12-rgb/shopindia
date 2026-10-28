import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Banknote,
  ShieldAlert,
  Clock,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Search,
  Bike,
  CreditCard,
  Download
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

interface RemittanceRecord {
  id: string;
  amount: number;
  status: string;
  clearanceMode: string;
  razorpayPaymentId?: string;
  superAdminRazorpayId?: string;
  notes?: string;
  createdAt: string;
  receivedByAdminAt?: string;
  remittedToSuperAt?: string;
  riderProfile?: {
    id: string;
    user?: { name: string; phone: string; email: string };
    branch?: { name: string; city: string };
  };
}

interface SuperBankDetails {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
  upiId: string;
}

export const CODSettingsPage: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'ledger' | 'fleet' | 'settings'>('ledger');

  // Rules Settings State
  const [settings, setSettings] = useState<CODSettings>({
    deadlineRule: 'end_of_day',
    orderCountThreshold: 3,
    maxFloatLimit: 3000,
    allowRegionalCash: true,
    autoPauseRider: true,
  });

  // Super Admin Bank Details State
  const [bankDetails, setBankDetails] = useState<SuperBankDetails>({
    bankName: '',
    accountNumber: '',
    ifsc: '',
    accountHolder: '',
    upiId: '',
  });
  const [savingBank, setSavingBank] = useState<boolean>(false);
  const [bankSuccess, setBankSuccess] = useState<string | null>(null);

  // Monitored Fleet State
  const [riders, setRiders] = useState<MonitoredRider[]>([]);
  const [totalFloatingCash, setTotalFloatingCash] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remittance Collections Ledger State
  const [remittances, setRemittances] = useState<RemittanceRecord[]>([]);
  const [totalCollected, setTotalCollected] = useState<number>(0);
  const [pendingBankCount, setPendingBankCount] = useState<number>(0);
  const [loadingRemittances, setLoadingRemittances] = useState<boolean>(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Date Filter State
  const [dateChip, setDateChip] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Rider Fleet Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<'all' | 'compliant' | 'warning' | 'overdue_paused'>('all');

  // Manual Clearance Modal
  const [selectedRider, setSelectedRider] = useState<MonitoredRider | null>(null);
  const [clearNotes, setClearNotes] = useState<string>('');
  const [clearing, setClearing] = useState<boolean>(false);

  // Compute date strings based on chip
  const getDateRangeForChip = (chip: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (chip === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (chip === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
    } else if (chip === '7d') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = now;
    } else if (chip === '30d') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = now;
    }
    return {
      start: start ? start.toISOString().split('T')[0] : '',
      end: end ? end.toISOString().split('T')[0] : '',
    };
  };

  const fetchRemittances = async () => {
    setLoadingRemittances(true);
    try {
      let sDate = startDate;
      let eDate = endDate;
      if (dateChip !== 'custom' && dateChip !== 'all') {
        const computed = getDateRangeForChip(dateChip);
        sDate = computed.start;
        eDate = computed.end;
      }

      const params = new URLSearchParams();
      if (sDate) params.append('startDate', sDate);
      if (eDate) params.append('endDate', eDate);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (ledgerSearch.trim()) params.append('search', ledgerSearch.trim());

      const res: any = await api.get(`/api/admin/cod-settings/remittances?${params.toString()}`);
      if (res?.success) {
        setRemittances(res.remittances || []);
        setTotalCollected(res.totalCollected || 0);
        setPendingBankCount(res.pendingBankCount || 0);
      }
    } catch (err: unknown) {
      console.error('Failed to load remittances:', err);
    } finally {
      setLoadingRemittances(false);
    }
  };

  const fetchSettingsAndRiders = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [settingsRes, ridersRes, bankRes]: any = await Promise.all([
        api.get('/api/admin/cod-settings'),
        api.get('/api/admin/cod-settings/riders'),
        api.get('/api/admin/cod-settings/super-bank-details'),
      ]);

      if (settingsRes?.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
      if (ridersRes?.success && ridersRes.riders) {
        setRiders(ridersRes.riders);
        setTotalFloatingCash(ridersRes.totalFloatingCash || 0);
      }
      if (bankRes?.success && bankRes.bankDetails) {
        setBankDetails(bankRes.bankDetails);
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
    fetchRemittances();
  }, []);

  useEffect(() => {
    fetchRemittances();
  }, [dateChip, startDate, endDate, statusFilter]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const res: any = await api.post('/api/admin/cod-settings', settings);
      if (res?.success) {
        setSaveSuccess('COD clearance rules successfully updated and enforced platform-wide!');
        setTimeout(() => setSaveSuccess(null), 4000);
        await fetchSettingsAndRiders();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankSuccess(null);
    try {
      const res: any = await api.post('/api/admin/cod-settings/super-bank-details', bankDetails);
      if (res?.success) {
        setBankSuccess('Super Admin bank remittance details updated securely for Regional Hubs.');
        setTimeout(() => setBankSuccess(null), 4000);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update bank details');
    } finally {
      setSavingBank(false);
    }
  };

  const handleVerifyBankPayment = async (remittanceId: string) => {
    if (!window.confirm('Confirm that you have checked the company bank statement and received this offline transfer?')) {
      return;
    }
    setVerifyingId(remittanceId);
    try {
      const res: any = await api.post(`/api/admin/cod-settings/remittances/${remittanceId}/verify-bank`, {});
      if (res?.success) {
        alert(res.message || 'Payment marked as verified and added to company ledger!');
        fetchRemittances();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to verify bank remittance');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleForceClear = async () => {
    if (!selectedRider) return;
    setClearing(true);
    try {
      const res: any = await api.post(`/api/admin/cod-settings/riders/${selectedRider.id}/force-clear`, {
        notes: clearNotes,
      });
      if (res?.success) {
        setSelectedRider(null);
        setClearNotes('');
        await fetchSettingsAndRiders();
        await fetchRemittances();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to clear rider float');
    } finally {
      setClearing(false);
    }
  };

  const exportToCSV = () => {
    if (remittances.length === 0) return alert('No remittance records to export');
    const headers = ['Date', 'Rider/Payer', 'Phone', 'City', 'Amount (INR)', 'Clearance Mode', 'Payment/UTR ID', 'Status', 'Notes'];
    const rows = remittances.map((r) => [
      new Date(r.createdAt).toLocaleString('en-IN'),
      r.riderProfile?.user?.name || 'Rider',
      r.riderProfile?.user?.phone || '',
      r.riderProfile?.branch?.city || '',
      r.amount,
      r.clearanceMode,
      r.razorpayPaymentId || r.superAdminRazorpayId || '—',
      r.status,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ShopIndia_COD_Collections_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRiders = riders.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm) ||
      r.branch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = fleetStatusFilter === 'all' || r.complianceStatus === fleetStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const compliantCount = riders.filter((r) => r.complianceStatus === 'compliant').length;
  const warningCount = riders.filter((r) => r.complianceStatus === 'warning').length;
  const overdueCount = riders.filter((r) => r.complianceStatus === 'overdue_paused').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-2xl">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-heading">
                COD Clearance & Cash Float Management
              </h1>
              <p className="text-xs text-slate-500">
                Track date-wise customer cash receipts, audit Razorpay & Regional Hub bank settlements, and configure fleet limits.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Main Tab Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ledger' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collections Ledger</span>
              {pendingBankCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] animate-pulse">
                  {pendingBankCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'fleet' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Fleet Custody Monitor</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'settings' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Rules & Bank Setup</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchSettingsAndRiders();
              fetchRemittances();
            }}
            disabled={loading || loadingRemittances}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Refresh All"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || loadingRemittances) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {bankSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{bankSuccess}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-medium flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: COLLECTIONS & REMITTANCES LEDGER (Date-Wise Customizations) */}
      {/* ============================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Quick Date Chips & Custom Calendar Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase mr-1">Date Period:</span>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom Range 📅' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setDateChip(chip.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    dateChip === chip.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Custom Range Date Pickers */}
            {dateChip === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">From Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">To Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium"
                  />
                </div>
              </div>
            )}

            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-2xs self-start lg:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Date-Filtered Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Total Collected & Cleared</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
                ₹{totalCollected.toLocaleString('en-IN')}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">In selected period ({remittances.length} records)</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Pending Bank Verifications</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 mt-2 font-mono">
                {pendingBankCount} Transfers
              </p>
              <span className="text-xs text-amber-700/80 mt-1 block">Requires manual UTR check</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Fleet Cash in Field</span>
                <Banknote className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-orange-600 mt-2 font-mono">
                ₹{totalFloatingCash.toLocaleString('en-IN')}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">Currently with {riders.length} active riders</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Auto-Settled via Razorpay</span>
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-600 mt-2 font-mono">
                {remittances.filter((r) => r.clearanceMode === 'online' || r.razorpayPaymentId).length}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">100% gateway reconciled</span>
            </div>
          </div>

          {/* Table Search & Status Filter */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search rider, phone, UTR or Payment ID..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchRemittances()}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 w-56 sm:w-72"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Modes & Statuses</option>
                  <option value="pending_bank_verification">⚠️ Pending Bank Verification (UTR)</option>
                  <option value="paid_online">🟢 Razorpay Online Auto-Settled</option>
                  <option value="verified_bank">🔵 Verified Bank Receipt</option>
                </select>
              </div>

              <div className="text-xs text-slate-400">
                Showing <strong>{remittances.length}</strong> collections in period
              </div>
            </div>

            {/* Remittances Ledger Table */}
            {loadingRemittances ? (
              <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <span>Loading date-wise remittances...</span>
              </div>
            ) : remittances.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600 text-sm">No remittance records found for this period.</p>
                <p className="text-[11px]">When delivery riders or regional hubs remit cash, transactions appear here with full audit proof.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Payer / Partner</th>
                      <th className="py-3 px-4">Amount Cleared</th>
                      <th className="py-3 px-4">Payment Channel & Proof</th>
                      <th className="py-3 px-4">Verification Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {remittances.map((r) => {
                      const isPendingBank = r.clearanceMode === 'bank_transfer' && !r.remittedToSuperAt && r.superAdminRazorpayId;
                      const partnerName = r.riderProfile?.user?.name || 'Rider';
                      const city = r.riderProfile?.branch?.city || 'HQ';
                      const utrOrId = r.superAdminRazorpayId || r.razorpayPaymentId || '—';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {new Date(r.createdAt).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{partnerName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {r.riderProfile?.user?.phone} • {city}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-black text-slate-900 font-mono text-sm">
                            ₹{r.amount.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4">
                            {r.clearanceMode === 'online' || r.razorpayPaymentId ? (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Razorpay: {r.razorpayPaymentId || 'Online'}</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-blue-700 font-bold">
                                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Bank UTR: {utrOrId}</span>
                                </div>
                                {r.notes && <p className="text-[10px] text-slate-500 truncate max-w-xs">{r.notes}</p>}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {isPendingBank ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-max">
                                <Clock className="w-3 h-3 text-amber-700" /> Awaiting Super Admin Check
                              </span>
                            ) : r.clearanceMode === 'online' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 w-max block">
                                Auto-Settled via Gateway
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 w-max block">
                                Verified Bank Receipt
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isPendingBank ? (
                              <button
                                type="button"
                                disabled={verifyingId === r.id}
                                onClick={() => handleVerifyBankPayment(r.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              >
                                {verifyingId === r.id ? 'Verifying...' : 'Verify Bank Receipt'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Recorded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LIVE FLEET FLOAT CUSTODY MONITOR */}
      {/* ============================================================== */}
      {activeTab === 'fleet' && (
        <div className="space-y-6">
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
                  value={fleetStatusFilter}
                  onChange={(e) => setFleetStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="all">All Riders</option>
                  <option value="compliant">Compliant</option>
                  <option value="warning">Approaching Limit</option>
                  <option value="overdue_paused">Overdue / Paused</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading fleet monitor...</div>
            ) : filteredRiders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No matching riders found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Rider Profile</th>
                      <th className="py-3 px-4">Territory / Branch</th>
                      <th className="py-3 px-4">Floating Cash</th>
                      <th className="py-3 px-4">Unremitted Orders</th>
                      <th className="py-3 px-4">Compliance Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRiders.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{r.phone} • {r.vehicleType}</div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">{r.branch}</td>

                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 font-mono text-sm">
                            ₹{r.codCashFloat.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-normal">
                            Limit: ₹{r.codFloatLimit.toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {r.unremittedDeliveriesCount} orders
                        </td>

                        <td className="py-3.5 px-4">
                          {r.complianceStatus === 'compliant' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Compliant
                            </span>
                          )}
                          {r.complianceStatus === 'warning' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Approaching Limit
                            </span>
                          )}
                          {r.complianceStatus === 'overdue_paused' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              Radar Paused
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRider(r)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            Force Clear
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PLATFORM POLICIES & SUPER ADMIN BANK SETUP */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Official Super Admin Bank Details */}
          <form onSubmit={handleSaveBankDetails} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Super Admin Bank Remittance Coordinates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These bank details are isolated and securely displayed <strong>only</strong> to authenticated Regional Admins for offline NEFT/IMPS/UPI cash pool remittance.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank Ltd / State Bank of India"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50200088921456"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC0001234"
                  value={bankDetails.ifsc}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Beneficiary Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ShopIndia Technologies Private Limited"
                  value={bankDetails.accountHolder}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Company UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. shopindia.hq@okhdfcbank"
                  value={bankDetails.upiId}
                  onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono font-medium text-emerald-700"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingBank}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingBank ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Bank Remittance Details</span>
              </button>
            </div>
          </form>

          {/* Card 2: Platform COD Policies & Limits */}
          <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                COD Clearance Rules & Platform Policies
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define mandatory remittance cycles and cash custody thresholds before rider dispatches are paused.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {/* Remittance Deadline Policy */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  1. Remittance Deadline Policy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                      settings.deadlineRule === 'end_of_day'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">End of the Day</span>
                      <input
                        type="radio"
                        name="deadlineRule"
                        checked={settings.deadlineRule === 'end_of_day'}
                        onChange={() => setSettings({ ...settings, deadlineRule: 'end_of_day' })}
                        className="accent-emerald-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-normal">
                      Must clear collected cash before midnight to resume next-day dispatches.
                    </p>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                      settings.deadlineRule === 'order_count'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-950 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Order Count Threshold</span>
                      <input
                        type="radio"
                        name="deadlineRule"
                        checked={settings.deadlineRule === 'order_count'}
                        onChange={() => setSettings({ ...settings, deadlineRule: 'order_count' })}
                        className="accent-emerald-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-normal">
                      Requires immediate clearance after completing consecutive COD orders.
                    </p>
                  </label>
                </div>
              </div>

              {/* Float Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase">2. Max Floating Cash Limit (₹)</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">₹{settings.maxFloatLimit}</span>
                </div>
                <input
                  type="number"
                  min={500}
                  max={20000}
                  step={500}
                  value={settings.maxFloatLimit}
                  onChange={(e) => setSettings({ ...settings, maxFloatLimit: Number(e.target.value) || 3000 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800">Auto-Pause Rider Radar</span>
                    <p className="text-[11px] text-slate-500">Temporarily prevent dispatches when limit exceeded</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPauseRider}
                    onChange={(e) => setSettings({ ...settings, autoPauseRider: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800">Regional Admin Physical Handover</span>
                    <p className="text-[11px] text-slate-500">Allow physical cash submission if hub exists in area</p>
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

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Platform Policies</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Force Clear Modal */}
      {selectedRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Force Clear Floating Cash</h3>
            <p className="text-xs text-slate-500">
              Manually reset cash float for <strong className="text-slate-800">{selectedRider.name}</strong> to ₹0. An immutable ledger entry will record this admin action.
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <span className="text-slate-500">Current Cash Float:</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">₹{selectedRider.codCashFloat}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clearance Reason / Reference</label>
              <textarea
                rows={2}
                value={clearNotes}
                onChange={(e) => setClearNotes(e.target.value)}
                placeholder="e.g. Verified manual direct bank transfer to HQ account"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {clearing ? 'Clearing...' : 'Confirm Force Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
