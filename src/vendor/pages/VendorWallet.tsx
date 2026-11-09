import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import {
  ArrowDownRight,
  Calendar,
  Download,
  Search,
  RefreshCw,
  X,
  Building2,
  Clock,
  CheckCircle2,
  Copy,
  Zap,
  CreditCard,
  ShoppingBag
} from 'lucide-react';

export const VendorWallet: React.FC = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payouts' | 'orders'>('payouts');

  // Modal states
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [amount, setAmount] = useState<number>(1000);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const [bankModal, setBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submittingBank, setSubmittingBank] = useState(false);

  // Filters
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'last_month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const loadWallet = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    let url = '/api/vendor/wallet';
    const params = new URLSearchParams();
    if (datePreset === 'this_month') params.append('period', 'this_month');
    if (datePreset === 'last_month') params.append('period', 'last_month');
    if (datePreset === 'custom') {
      if (customStart) params.append('from', customStart);
      if (customEnd) params.append('to', customEnd);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    api.get<any>(url)
      .then(d => {
        if (d?.success) setWallet(d);
      })
      .catch(console.error)
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  };

  useEffect(() => {
    loadWallet(true);
  }, [datePreset, customStart, customEnd]);

  // Instant real-time updates via WebSockets when payouts change, orders finish, or wallet updates
  useSocketEvent('wallet:updated', () => loadWallet(false));
  useSocketEvent('payout:updated', () => loadWallet(false));
  useSocketEvent('order:status_changed', () => loadWallet(false));

  useEffect(() => {
    if (wallet?.bankDetails) {
      setBankName(wallet.bankDetails.bankName || '');
      setAccountHolder(wallet.bankDetails.accountHolder || '');
      setAccountNumber(wallet.bankDetails.accountNumber || '');
      setIfsc(wallet.bankDetails.ifsc || '');
      setUpiId(wallet.bankDetails.upiId || '');
    }
  }, [wallet]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setSubmittingWithdraw(true);
    try {
      const res: any = await api.post('/api/vendor/wallet/withdraw', { amount });
      alert(res.message || 'Withdrawal request submitted successfully!');
      setWithdrawModal(false);
      loadWallet(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBank(true);
    try {
      await api.patch('/api/vendor/wallet/bank-details', {
        bankName,
        accountHolder,
        accountNumber,
        ifsc,
        upiId,
      });
      alert('Bank & UPI details updated successfully!');
      setBankModal(false);
      loadWallet(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save bank details.');
    } finally {
      setSubmittingBank(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  // Filtered Payouts
  const filteredPayouts = useMemo(() => {
    if (!wallet?.payouts) return [];
    const q = searchQuery.toLowerCase().trim();
    return wallet.payouts.filter((p: any) => {
      if (!q) return true;
      return (
        p.payoutRef?.toLowerCase().includes(q) ||
        p.utr?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.amount?.toString().includes(q) ||
        p.paymentMode?.toLowerCase().includes(q)
      );
    });
  }, [wallet?.payouts, searchQuery]);

  // Filtered Delivered Orders
  const filteredOrders = useMemo(() => {
    if (!wallet?.ordersLedger) return [];
    const q = searchQuery.toLowerCase().trim();
    return wallet.ordersLedger.filter((o: any) => {
      if (!q) return true;
      const matchItems = o.items?.some((it: any) => it.name.toLowerCase().includes(q));
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.customerPhone?.includes(q) ||
        o.totalDue?.toString().includes(q) ||
        matchItems
      );
    });
  }, [wallet?.ordersLedger, searchQuery]);

  // Export CSV
  const exportCSV = () => {
    if (activeTab === 'payouts') {
      if (!filteredPayouts.length) return alert('No payouts to export.');
      const headers = ['Date', 'Payout Ref', 'Amount (INR)', 'Payment Mode', 'Bank UTR', 'Status', 'Notes'];
      const rows = filteredPayouts.map((p: any) => [
        `"${new Date(p.date).toLocaleString('en-IN')}"`,
        `"${p.payoutRef}"`,
        `"${p.amount}"`,
        `"${p.paymentMode}"`,
        `"${p.utr || '—'}"`,
        `"${p.status}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
      ].join(','));
      const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payouts-statement-${datePreset}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } else {
      if (!filteredOrders.length) return alert('No orders to export.');
      const headers = ['Order Date', 'Order #', 'Customer', 'Items', 'Total Due (INR)', 'Status'];
      const rows = filteredOrders.map((o: any) => [
        `"${new Date(o.date).toLocaleString('en-IN')}"`,
        `"${o.orderNumber}"`,
        `"${o.customerName}"`,
        `"${o.items?.map((it: any) => `${it.name} (x${it.quantity})`).join('; ')}"`,
        `"${o.totalDue}"`,
        `"${o.settlementStatus === 'cleared' ? 'Cleared by Admin' : 'Pending from Shop India'}"`,
      ].join(','));
      const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-ledger-${datePreset}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    }
  };

  if (loading && !wallet) {
    return <div className="h-64 skeleton-shimmer rounded-2xl" />;
  }

  const pendingAmount = wallet?.pendingFromShopIndia || 0;
  const clearedAmount = wallet?.totalClearedByAdmin || 0;
  const pendingRequestsSum = wallet?.pendingPayoutsSum || 0;
  const availableToWithdraw = Math.max(0, pendingAmount - pendingRequestsSum);

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-heading">Vendor Wallet & Settlement Ledger</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Transparent breakdown of outstanding balance from Shop India, verified bank UTR disbursements, and itemized orders
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadWallet(true)}
            className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              setAmount(availableToWithdraw);
              setWithdrawModal(true);
            }}
            disabled={availableToWithdraw <= 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>Request Payout</span>
          </button>
        </div>
      </div>

      {/* 3 Core Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: PENDING FROM SHOP INDIA (Outstanding Receivable) */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg space-y-2 relative overflow-hidden">
          <div className="absolute right-[-15px] top-[-15px] w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-extrabold tracking-wider text-amber-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending from Shop India</span>
            </p>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
              Outstanding
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black font-numbers">₹{pendingAmount.toLocaleString('en-IN')}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-amber-100 pt-2 border-t border-amber-400/40">
            <span>Delivered items awaiting payout</span>
            {pendingRequestsSum > 0 && (
              <span className="font-bold bg-amber-800/40 px-2 py-0.5 rounded text-[10.5px]">
                ₹{pendingRequestsSum.toLocaleString('en-IN')} in review
              </span>
            )}
          </div>
        </div>

        {/* Card 2: TRANSFERRED TO YOUR BANK (All-Time Cleared by Super Admin) */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-lg space-y-2 relative overflow-hidden">
          <div className="absolute right-[-15px] top-[-15px] w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-extrabold tracking-wider text-emerald-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Transferred to Your Bank</span>
            </p>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
              All-Time Cleared
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black font-numbers">₹{clearedAmount.toLocaleString('en-IN')}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-emerald-100 pt-2 border-t border-emerald-500/40">
            <span>Settled with Bank UTR reference</span>
            <span className="font-bold">{wallet?.payouts?.filter((p: any) => p.status === 'completed').length || 0} Transfers</span>
          </div>
        </div>

        {/* Card 3: SETTLED BANK & UPI ACCOUNT */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-sm space-y-2 relative flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-gray-400" />
                <span>Settlement Bank &amp; UPI</span>
              </p>
              <button
                onClick={() => setBankModal(true)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {wallet?.bankDetails?.bankName || wallet?.bankDetails?.upiId ? 'Edit Details' : 'Link Account'}
              </button>
            </div>
            <p className="text-base font-black text-gray-900">{wallet?.bankDetails?.bankName || 'Direct Account'}</p>
            <p className="text-xs font-mono text-gray-600 font-semibold truncate">
              {wallet?.bankDetails?.accountNumber ? `A/C: ${wallet.bankDetails.accountNumber}` : 'Add bank account for IMPS/NEFT'}
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 text-xs">
            {wallet?.bankDetails?.upiId ? (
              <p className="font-mono font-bold text-emerald-700 truncate">⚡ UPI: {wallet.bankDetails.upiId}</p>
            ) : (
              <p className="text-gray-400 font-medium">Add UPI ID for instant 1-click settlements</p>
            )}
          </div>
        </div>
      </div>

      {/* Month & Date-wise Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Month Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Period:</span>
            </span>
            <button
              onClick={() => setDatePreset('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDatePreset('this_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'this_month'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset('last_month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'last_month'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'custom'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Custom Date
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportCSV}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
              <span>From:</span>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
              <span>To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* Filtered Period Metrics Row */}
        {datePreset !== 'all' && (
          <div className="bg-slate-50 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-200/70">
            <span className="font-bold text-slate-700">
              Selected Period Activity:
            </span>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium text-amber-800">
                ⏳ Accrued Pending: <strong>₹{(wallet?.periodStats?.periodPending || 0).toLocaleString('en-IN')}</strong>
              </span>
              <span className="font-medium text-emerald-800">
                ✅ Cleared &amp; Paid: <strong>₹{(wallet?.periodStats?.periodCleared || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Ledger Section with Two Distinct Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="px-5 pt-4 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('payouts')}
              className={`pb-3.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'payouts'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Bank Transfers &amp; UTRs ({filteredPayouts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-3.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Delivered Orders &amp; Items Due ({filteredOrders.length})</span>
            </button>
          </div>

          {/* Search Query */}
          <div className="relative pb-3 sm:pb-0 w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={activeTab === 'payouts' ? "Search UTR, amount, notes..." : "Search order #, customer, item..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* TAB 1 CONTENT: Bank Transfers & UTRs Received */}
        {activeTab === 'payouts' && (
          <div className="overflow-x-auto">
            {filteredPayouts.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400 space-y-1">
                <CreditCard className="w-8 h-8 mx-auto text-gray-300" />
                <p className="font-bold text-gray-600 text-sm">No Payout Records Found</p>
                <p>When Super Admin transfers funds to your bank/UPI, verified UTR records appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-gray-200/80 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Payout Ref</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Bank UTR / Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayouts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {new Date(p.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {p.payoutRef}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-700 text-sm">
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10.5px]">
                          {p.paymentMode === 'UPI Transfer' ? <Zap className="w-3 h-3 text-emerald-600" /> : <Building2 className="w-3 h-3 text-blue-600" />}
                          <span>{p.paymentMode}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.utr ? (
                          <div className="flex items-center gap-1.5 font-mono font-bold text-gray-800 bg-slate-50 px-2 py-1 rounded-lg border border-gray-200 w-fit">
                            <span>{p.utr}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(p.utr, p.id)}
                              className="text-gray-400 hover:text-emerald-700 p-0.5"
                              title="Copy Bank UTR"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {copiedUtr === p.id && (
                              <span className="text-[9.5px] text-emerald-700 font-sans font-bold">Copied!</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono italic">Pending UTR</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          p.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.status === 'completed' ? '✓ Cleared' : p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate" title={p.notes}>
                        {p.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2 CONTENT: Delivered Orders & Items Due */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400 space-y-1">
                <ShoppingBag className="w-8 h-8 mx-auto text-gray-300" />
                <p className="font-bold text-gray-600 text-sm">No Delivered Orders Found</p>
                <p>When orders are delivered to customers, their payable breakdown will reflect here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-gray-200/80 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Products &amp; Quantities</th>
                    <th className="py-3 px-4">Amount Due</th>
                    <th className="py-3 px-4">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {new Date(o.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        #{o.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-800 block">{o.customerName}</span>
                        {o.customerPhone && (
                          <span className="text-[11px] font-mono text-gray-400">{o.customerPhone}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-sm">
                          {o.items?.map((it: any, i: number) => (
                            <div key={i} className="text-[11px] text-gray-700 flex items-center justify-between gap-3">
                              <span className="truncate">{it.name} <strong className="text-gray-900">× {it.quantity}</strong></span>
                              <span className="font-mono text-gray-500 shrink-0">₹{it.totalPrice}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-gray-900 text-sm">
                        ₹{Number(o.totalDue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">
                        {o.settlementStatus === 'cleared' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Cleared &amp; Paid</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Pending from Shop India</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* WITHDRAWAL REQUEST MODAL */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-gray-900">Request Payout from Shop India</h3>
              <button onClick={() => setWithdrawModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
                <p className="font-bold">Total Available for Payout: ₹{availableToWithdraw.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Super Admin will review and disburse funds directly to your settled Bank Account or UPI handle.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Withdrawal Amount (₹)</label>
                  <button
                    type="button"
                    onClick={() => setAmount(Number(availableToWithdraw.toFixed(2)))}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Max (₹{availableToWithdraw.toFixed(2)})
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={availableToWithdraw}
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs space-y-1">
                <p className="font-bold text-gray-700">Destination Account:</p>
                <p className="text-gray-600 font-mono">
                  {wallet?.bankDetails?.upiId ? `⚡ UPI: ${wallet.bankDetails.upiId}` : wallet?.bankDetails?.accountNumber ? `🏦 A/C: ${wallet.bankDetails.accountNumber} (${wallet.bankDetails.bankName})` : '⚠️ No bank linked'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw || availableToWithdraw <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>{submittingWithdraw ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BANK & UPI DETAILS MODAL */}
      {bankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-gray-900">Settled Bank &amp; UPI Details</h3>
              <button onClick={() => setBankModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankDetails} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Instant UPI ID (Recommended for fast settlements)</label>
                <input
                  type="text"
                  placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div className="border-t border-gray-100 pt-2 font-bold text-gray-500 uppercase text-[10px]">
                Or Bank Account Details
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  placeholder="Name as printed in passbook"
                  value={accountHolder}
                  onChange={e => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 50100458921102"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001824"
                  value={ifsc}
                  onChange={e => setIfsc(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase text-gray-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setBankModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBank}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  {submittingBank ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
