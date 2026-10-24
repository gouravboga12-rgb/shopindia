import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  ArrowDownRight,
  Calendar,
  Download,
  Search,
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  Building2,
} from 'lucide-react';

export const VendorWallet: React.FC = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [amount, setAmount] = useState<number>(1000);

  const [bankModal, setBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

  // Date Filter & Table Controls
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'withdrawal'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const load = () => {
    setLoading(true);
    api.get<any>('/api/vendor/wallet')
      .then(d => setWallet(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (wallet?.bankDetails) {
      setBankName(wallet.bankDetails.bankName || '');
      setAccountHolder(wallet.bankDetails.accountHolder || '');
      setAccountNumber(wallet.bankDetails.accountNumber || '');
      setIfsc(wallet.bankDetails.ifsc || '');
    }
  }, [wallet]);

  const handleWithdraw = async () => {
    try {
      await api.post('/api/vendor/wallet/withdraw', { amount });
      load();
      setWithdrawModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveBankDetails = async () => {
    try {
      await api.patch('/api/vendor/wallet/bank-details', {
        bankName,
        accountHolder,
        accountNumber,
        ifsc
      });
      load();
      setBankModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to test if a transaction createdAt is within the chosen preset / range
  const isWithinRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();

    if (datePreset === 'all') return true;

    if (datePreset === 'today') {
      return d.toDateString() === now.toDateString();
    }

    if (datePreset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      return d.toDateString() === yest.toDateString();
    }

    if (datePreset === '7days') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      past7.setHours(0, 0, 0, 0);
      return d >= past7 && d <= now;
    }

    if (datePreset === '30days') {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 30);
      past30.setHours(0, 0, 0, 0);
      return d >= past30 && d <= now;
    }

    if (datePreset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= startOfMonth && d <= now;
    }

    if (datePreset === 'custom') {
      if (customStart) {
        const s = new Date(customStart);
        s.setHours(0, 0, 0, 0);
        if (d < s) return false;
      }
      if (customEnd) {
        const e = new Date(customEnd);
        e.setHours(23, 59, 59, 999);
        if (d > e) return false;
      }
      return true;
    }

    return true;
  };

  // Filtered transactions memo
  const filteredTransactions = useMemo(() => {
    if (!wallet?.transactions) return [];
    return wallet.transactions.filter((t: any) => {
      // 1. Date filter
      if (!isWithinRange(t.createdAt)) return false;

      // 2. Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const noteMatch = t.note?.toLowerCase().includes(q);
        const typeMatch = t.type?.toLowerCase().includes(q);
        const statusMatch = t.status?.toLowerCase().includes(q);
        const amountMatch = t.amount?.toString().includes(q);
        if (!noteMatch && !typeMatch && !statusMatch && !amountMatch) return false;
      }

      return true;
    });
  }, [wallet?.transactions, datePreset, customStart, customEnd, typeFilter, searchQuery]);

  // Dynamic metrics for the selected period
  const periodStats = useMemo(() => {
    let salesTotal = 0;
    let withdrawalsTotal = 0;
    let salesCount = 0;
    let withdrawalsCount = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'sale') {
        salesTotal += (t.amount > 0 ? t.amount : 0);
        salesCount++;
      } else if (t.type === 'withdrawal') {
        withdrawalsTotal += Math.abs(t.amount);
        withdrawalsCount++;
      }
    }

    return {
      salesTotal,
      withdrawalsTotal,
      net: salesTotal - withdrawalsTotal,
      totalCount: filteredTransactions.length,
      salesCount,
      withdrawalsCount
    };
  }, [filteredTransactions]);

  // Export CSV
  const exportCSV = () => {
    if (!filteredTransactions.length) {
      alert('No transactions to export for the selected filter.');
      return;
    }
    const headers = ['Date', 'Time', 'Type', 'Amount (INR)', 'Status', 'Note/Reference'];
    const rows = filteredTransactions.map((t: any) => {
      const dateObj = t.createdAt ? new Date(t.createdAt) : null;
      const dateStr = dateObj ? dateObj.toLocaleDateString('en-IN') : '—';
      const timeStr = dateObj ? dateObj.toLocaleTimeString('en-IN') : '—';
      return [
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${t.type}"`,
        `"${t.amount}"`,
        `"${t.status}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendor-transactions-${datePreset}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFilterActive = datePreset !== 'all' || typeFilter !== 'all' || searchQuery.trim() !== '' || customStart !== '' || customEnd !== '';

  const clearAllFilters = () => {
    setDatePreset('all');
    setCustomStart('');
    setCustomEnd('');
    setTypeFilter('all');
    setSearchQuery('');
  };

  if (loading) return <div className="h-40 skeleton-shimmer rounded-2xl" />;

  const pendingSum = wallet?.transactions
    ?.filter((t: any) => t.type === 'withdrawal' && t.status === 'pending')
    ?.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) || 0;
  
  const rawBalance = wallet?.walletBalance || 0;
  const availableBalance = rawBalance - pendingSum;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Vendor Wallet & Payouts</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitor earnings ledger, platform commission deductions, date-filtered transactions, and request bank payouts (FR-02.5)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setWithdrawModal(true)}
            disabled={availableBalance <= 0}
            className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Request Payout</span>
          </button>
        </div>
      </div>

      {/* 3 Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Available Wallet Balance */}
        <div className="bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857] rounded-2xl p-6 text-white shadow-xl space-y-2 relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-xs uppercase font-bold tracking-wider text-white/80">Available Wallet Balance</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black font-numbers">₹{availableBalance.toLocaleString('en-IN')}</p>
            {pendingSum > 0 && (
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                ₹{pendingSum} pending payout
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-white/80 pt-1 border-t border-white/20">
            <span>Commission Rate: <strong>{wallet?.commissionRate || 10}%</strong></span>
            {availableBalance <= 0 && (
              <span className="text-[10px] bg-amber-400/30 text-amber-100 px-1.5 py-0.5 rounded font-semibold">
                Settles on deliveries
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Gross Sales Revenue */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-premium space-y-2 relative">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gross Sales Revenue (All-Time)</p>
          <p className="text-2xl font-black text-gray-900 font-numbers">₹{(wallet?.allTimeGross || wallet?.grossRevenue || 0).toLocaleString('en-IN')}</p>
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span className="text-red-500 font-bold">-₹{(wallet?.allTimeCommission || wallet?.totalCommission || 0).toLocaleString('en-IN')} Platform Comm.</span>
            <span className="text-emerald-600 font-bold font-numbers">{wallet?.orderCount || 0} Paid Orders</span>
          </div>
        </div>

        {/* Card 3: Settled Bank Account */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-premium space-y-2 relative group">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={13} className="text-gray-400" />
              Settled Bank Account
            </p>
            <button
              onClick={() => setBankModal(true)}
              className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {wallet?.bankDetails?.bankName ? 'Edit Details' : 'Link Account'}
            </button>
          </div>
          <p className="text-base font-black text-gray-900">{wallet?.bankDetails?.bankName || 'No Bank Linked'}</p>
          <p className="text-xs font-mono text-gray-600 font-semibold">{wallet?.bankDetails?.accountNumber || 'Add account to receive NEFT/IMPS transfers'}</p>
          {wallet?.bankDetails?.ifsc && (
            <p className="text-[11px] font-mono text-gray-400 uppercase">IFSC: {wallet.bankDetails.ifsc}</p>
          )}
        </div>
      </div>

      {/* Transaction & Payout History Section with Date-Wise Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        {/* Section Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-gray-900 font-heading">Transaction &amp; Payout History</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {filteredTransactions.length} records
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Filter sales credits, commission debits, and withdrawal requests date-wise</p>
          </div>

          {/* Action buttons: Clear Filters & Export CSV */}
          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <X size={12} />
                <span>Reset Filters</span>
              </button>
            )}
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-[#0F2C59] hover:bg-[#1E3A8A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Download Statement CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Date Presets + Custom Date Pickers + Type Filter + Search) */}
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Date Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                <Calendar size={12} /> Date:
              </span>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range 📅' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    datePreset === preset.id
                      ? 'bg-[#10B981] text-white shadow-xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100/70'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Type Filter & Search Bar */}
            <div className="flex items-center gap-2 self-start lg:self-auto w-full lg:w-auto">
              {/* Type Pill Toggle */}
              <div className="inline-flex bg-white border border-gray-200 rounded-xl p-0.5 text-xs font-bold">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'sale', label: 'Sales (+)' },
                  { id: 'withdrawal', label: 'Payouts (-)' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTypeFilter(t.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                      typeFilter === t.id
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Quick Search */}
              <div className="relative flex-1 lg:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search order #, note..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Custom Date Range Pickers (Visible when 'custom' is active) */}
          {datePreset === 'custom' && (
            <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Calendar size={13} className="text-[#10B981]" />
                Select Custom Date Range:
              </span>
              <div className="flex items-center gap-2 text-xs">
                <label className="text-gray-500 font-semibold">From:</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#10B981]"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="text-gray-500 font-semibold">To:</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#10B981]"
                />
              </div>
              {(customStart || customEnd) && (
                <button
                  onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  Clear Range
                </button>
              )}
            </div>
          )}

          {/* Dynamic Period Summary Chips Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg font-bold flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-600" />
                <span>Sales Credits:</span>
                <span className="font-numbers font-black">+₹{periodStats.salesTotal.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-emerald-600">({periodStats.salesCount})</span>
              </span>

              <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200/80 rounded-lg font-bold flex items-center gap-1">
                <TrendingDown size={12} className="text-rose-600" />
                <span>Withdrawals:</span>
                <span className="font-numbers font-black">-₹{periodStats.withdrawalsTotal.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-rose-600">({periodStats.withdrawalsCount})</span>
              </span>

              <span className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200/80 rounded-lg font-bold flex items-center gap-1">
                <span>Net Activity:</span>
                <span className={`font-numbers font-black ${periodStats.net >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                  {periodStats.net >= 0 ? '+' : ''}₹{periodStats.net.toLocaleString('en-IN')}
                </span>
              </span>
            </div>

            <span className="text-[11px] text-gray-500 font-medium">
              Showing <strong>{filteredTransactions.length}</strong> of {wallet?.transactions?.length || 0} transactions
            </span>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3 font-bold">Date &amp; Time</th>
                <th className="px-5 py-3 font-bold">Transaction Type</th>
                <th className="px-5 py-3 font-bold">Amount (INR)</th>
                <th className="px-5 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold">Note / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    <Calendar size={28} className="mx-auto mb-2 text-gray-300 stroke-1" />
                    <p className="font-bold text-gray-500">No transactions match the selected date or filters.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Try selecting "All Time" or adjusting your date range.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t: any) => {
                  const dateObj = t.createdAt ? new Date(t.createdAt) : null;
                  const dateFormatted = dateObj ? dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                  const timeFormatted = dateObj ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Date & Time */}
                      <td className="px-5 py-3.5 text-gray-600">
                        <div className="font-bold text-gray-900">{dateFormatted}</div>
                        {timeFormatted && <div className="text-[10px] text-gray-400 font-mono">{timeFormatted}</div>}
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] capitalize ${
                          t.type === 'sale'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {t.type === 'sale' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          <span>{t.type}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className={`px-5 py-3.5 font-numbers font-black text-sm ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.amount >= 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                          t.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="px-5 py-3.5 text-gray-600 font-medium">
                        {t.note || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Withdrawal Modal */}
      {withdrawModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-lg font-heading">Request Payout</h3>
              <button onClick={() => setWithdrawModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Maximum withdrawable: <strong className="font-numbers text-emerald-600 font-bold">₹{Math.max(0, availableBalance)}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Withdrawal Amount (₹)</label>
              <input
                type="number"
                value={amount}
                max={Math.max(0, availableBalance)}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-numbers focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none"
              />
            </div>
            <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
              <span className="text-gray-500 font-semibold">Destination:</span>
              <p className="font-bold text-gray-800">{wallet?.bankDetails?.bankName || 'HDFC Bank'} ({wallet?.bankDetails?.accountNumber || 'Primary Account'})</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setWithdrawModal(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={amount <= 0 || amount > availableBalance}
                className="flex-1 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Bank Account Modal */}
      {bankModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-900 text-lg font-heading">Settlement Bank Details</h3>
              <button onClick={() => setBankModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50100458921102"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={e => setIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001824"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBankModal(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBankDetails}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
