import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Wallet, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, ShieldCheck, Zap, Calendar, Store,
  Phone, MessageCircle, Info, MapPin, UserX, UserCheck, ExternalLink, FileText
} from 'lucide-react';

interface PayoutRequestItem {
  id: string;
  partyType: 'VENDOR' | 'RIDER';
  partyId: string;
  amount: number;
  status: string;
  requestedAt: string;
  reviewedAt?: string;
  processedAt?: string;
  razorpayPayoutId?: string;
  notes?: string;
  bankSnapshot?: any;
  vendor?: any;
  riderProfile?: any;
}

interface VendorPayoutsPageProps {
  onOpenStatement?: (partyType: string, partyId: string, name: string) => void;
}

export const VendorPayoutsPage: React.FC<VendorPayoutsPageProps> = ({ onOpenStatement }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<PayoutRequestItem[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Modal State for Disbursing Payout (Marking Paid with UTR)
  const [activePayoutForComplete, setActivePayoutForComplete] = useState<PayoutRequestItem | null>(null);
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [payoutNotes, setPayoutNotes] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // Modal State for Rejection
  const [activePayoutForReject, setActivePayoutForReject] = useState<PayoutRequestItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Inspector & Account Suspension State
  const [inspectVendor, setInspectVendor] = useState<any | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string; isSuspended: boolean } | null>(null);
  const [suspending, setSuspending] = useState<boolean>(false);

  const getDateRangeParams = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { startDate: start };
    }
    if (dateFilter === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate()).toISOString();
      const end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999).toISOString();
      return { startDate: start, endDate: end };
    }
    if (dateFilter === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { startDate: start };
    }
    if (dateFilter === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { startDate: start };
    }
    if (dateFilter === 'custom' && customStart) {
      return { startDate: customStart, endDate: customEnd || undefined };
    }
    return {};
  };

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const dateParams = getDateRangeParams();
      const queryParams = new URLSearchParams({
        queue: 'vendor',
        status: statusFilter,
        ...(dateParams.startDate ? { startDate: dateParams.startDate } : {}),
        ...(dateParams.endDate ? { endDate: dateParams.endDate } : {}),
      });

      const res: any = await api.get(`/api/admin/payouts?${queryParams.toString()}`);
      if (res?.requests) setRequests(res.requests);
      if (res?.stats) setStats(res.stats);
    } catch (err: any) {
      console.error('Failed to load vendor payouts:', err);
      setActionMessage({ text: err.message || 'Failed to load vendor payouts.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, [statusFilter, dateFilter, customStart, customEnd]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingAction(true);
      const res: any = await api.post(`/api/admin/payouts/${id}/approve`, {
        notes: 'Approved by Super Admin for bank transfer disbursement',
      });
      if (res?.success) {
        setActionMessage({ text: res.message || 'Merchant payout approved.' });
        loadPayouts();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to approve payout.', isError: true });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDisburseWithUTR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayoutForComplete || !utrNumber.trim()) return;

    try {
      setProcessingAction(true);
      const res: any = await api.post(`/api/admin/payouts/${activePayoutForComplete.id}/complete`, {
        razorpayPayoutId: utrNumber.trim(),
        notes: payoutNotes.trim() || 'Disbursed via Super Admin Portal',
      });

      if (res?.success) {
        setActionMessage({ text: res.message || 'Merchant payout disbursed and ledger debited successfully!' });
        setActivePayoutForComplete(null);
        setUtrNumber('');
        setPayoutNotes('');
        loadPayouts();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to complete payout disbursement.', isError: true });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayoutForReject || !rejectionReason.trim()) return;

    try {
      setProcessingAction(true);
      const res: any = await api.post(`/api/admin/payouts/${activePayoutForReject.id}/reject`, {
        reason: rejectionReason.trim(),
      });

      if (res?.success) {
        setActionMessage({ text: res.message || 'Merchant payout request rejected.' });
        setActivePayoutForReject(null);
        setRejectionReason('');
        loadPayouts();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to reject payout.', isError: true });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspending(true);
    try {
      const res: any = await api.post('/api/admin/payouts/partner/toggle-suspend', {
        partyType: 'VENDOR',
        partyId: suspendTarget.id,
      });
      if (res?.success) {
        setActionMessage({ text: res.message || 'Merchant account status updated.' });
        loadPayouts();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to toggle merchant suspension.', isError: true });
    } finally {
      setSuspending(false);
      setSuspendTarget(null);
    }
  };

  const formatINR = (val?: number) => `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string, notes?: string) => {
    const isRegionalVerified = notes?.includes('[Regional Verification');
    const isRegionalEscalated = notes?.includes('[Regional Escalation');

    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Disbursed</span>;
      case 'approved':
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isRegionalVerified ? 'Regional Verified' : 'Approved'}
            </span>
            {isRegionalVerified && (
              <span className="text-[9.5px] text-emerald-600 font-semibold">Forwarded by Regional Lead</span>
            )}
          </div>
        );
      case 'under_review':
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[11px] font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {isRegionalEscalated ? 'Regional Escalated' : 'Under Review'}
            </span>
            {isRegionalEscalated && (
              <span className="text-[9.5px] text-amber-700 font-bold">Verification Issue Flagged</span>
            )}
          </div>
        );
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-[11px] font-bold"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[11px] font-bold">
              <Clock className="w-3.5 h-3.5" /> Direct (Pending)
            </span>
            <span className="text-[9.5px] text-slate-400">Awaiting Super Admin</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md">
              <Store className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Merchant & Store Payouts</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review, verify, and disburse bank transfers and fast UPI withdrawals for registered store merchants.
          </p>
        </div>

        <button
          onClick={loadPayouts}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Payouts</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${actionMessage.isError ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="underline hover:text-slate-900 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-transparent p-5 rounded-3xl border border-amber-200/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Awaiting Clearance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{formatINR(stats?.pendingAmount || 0)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{stats?.pendingCount || 0} merchant requests pending</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-5 rounded-3xl border border-blue-200/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Approved / Ready to Disburse</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{formatINR(stats?.approvedAmount || 0)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{stats?.approvedCount || 0} ready for IMPS / NEFT transfer</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent p-5 rounded-3xl border border-emerald-200/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Disbursed (Completed)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{formatINR(stats?.completedAmount || 0)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{stats?.completedCount || 0} disbursements with recorded UTR</div>
        </div>
      </div>

      {/* Date-Wise & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs overflow-x-auto">
            <span className="px-2 text-slate-500 font-bold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date:</span>
            {(['all', 'today', 'yesterday', '7d', '30d', 'custom'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-3 py-1 rounded-lg font-bold transition-all capitalize cursor-pointer ${dateFilter === d ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {d === '7d' ? 'Last 7 Days' : d === '30d' ? 'Last 30 Days' : d}
              </button>
            ))}
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Clearance</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed (Paid)</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              />
            </div>
            <button
              onClick={loadPayouts}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="py-3.5 px-4">Merchant Store</th>
                <th className="py-3.5 px-4">Disbursement Target (Bank / UPI)</th>
                <th className="py-3.5 px-4">Requested On</th>
                <th className="py-3.5 px-4 text-right">Withdrawal Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Super Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    Loading merchant payouts...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No merchant payout requests found for the selected filters.
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const vendor = req.vendor;
                  const bank = req.bankSnapshot || vendor;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>{vendor?.businessName || 'Merchant'}</span>
                          </div>
                          {vendor?.user?.status === 'suspended' || vendor?.isActive === false ? (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Location Details */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{vendor?.city || 'Location'}{vendor?.state ? `, ${vendor.state}` : ''} {vendor?.pincode ? `(${vendor.pincode})` : ''}</span>
                        </div>

                        {/* Dynamic Quick Call / WhatsApp / KYC Inspector Buttons */}
                        {(() => {
                          const contactPhone = vendor?.phone || vendor?.user?.phone || (req as any).bankSnapshot?.phone;
                          const cleanDigits = contactPhone ? contactPhone.replace(/\D/g, '').slice(-10) : '';
                          return (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {contactPhone ? (
                                <>
                                  <a
                                    href={`tel:${contactPhone}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10.5px] font-bold transition-colors"
                                    title={`Call Merchant (${contactPhone})`}
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>Call</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/91${cleanDigits}?text=${encodeURIComponent(`Hello ${vendor?.businessName || 'Merchant'}, regarding your ShopIndia payout request of ₹${req.amount}...`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold transition-colors"
                                    title={`Chat on WhatsApp (${contactPhone})`}
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-medium" title="No phone registered">
                                  <Phone className="w-2.5 h-2.5" /> No Phone
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setInspectVendor(vendor)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10.5px] font-bold transition-colors cursor-pointer"
                                title="Inspect Merchant KYC & Bank Documents"
                              >
                                <Info className="w-3 h-3 text-slate-500" />
                                <span>Info</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-4">
                        {bank?.upiId ? (
                          <div className="flex items-center gap-1 text-emerald-700 font-mono font-bold">
                            <Zap className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{bank.upiId}</span>
                          </div>
                        ) : bank?.accountNumber ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-800 font-semibold">{bank.bankName || 'Bank'}: ••••{bank.accountNumber.slice(-4)}</div>
                            <div className="text-[10px] text-slate-500 font-mono">IFSC: {bank.ifsc} • {bank.accountHolder}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No bank snapshot</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(req.requestedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="text-base font-black text-slate-900">{formatINR(req.amount)}</div>
                        <div className="text-[10px] text-slate-500">Wallet: {formatINR(vendor?.walletBalance)}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(req.status, req.notes)}
                        {req.notes && (
                          <div className="mt-1 text-[10px] text-slate-500 max-w-[180px] mx-auto truncate cursor-help" title={req.notes}>
                            📝 {req.notes.split('\n').pop()}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenStatement && vendor?.id && (
                            <button
                              onClick={() => onOpenStatement('VENDOR', vendor.id, vendor.businessName)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Statement
                            </button>
                          )}

                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={processingAction}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
                            >
                              Approve
                            </button>
                          )}

                          {req.status === 'approved' && (
                            <button
                              onClick={() => {
                                setActivePayoutForComplete(req);
                                setUtrNumber('');
                                setPayoutNotes('');
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Disburse UTR</span>
                            </button>
                          )}

                          {['pending', 'under_review', 'approved'].includes(req.status) && (
                            <button
                              onClick={() => {
                                setActivePayoutForReject(req);
                                setRejectionReason('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          )}

                          {req.status === 'completed' && req.razorpayPayoutId && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              UTR: {req.razorpayPayoutId}
                            </span>
                          )}

                          {vendor?.id && (
                            <button
                              type="button"
                              onClick={() => setSuspendTarget({
                                id: vendor.id,
                                name: vendor.businessName,
                                isSuspended: vendor?.user?.status === 'suspended' || vendor?.isActive === false,
                              })}
                              className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${
                                vendor?.user?.status === 'suspended' || vendor?.isActive === false
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              }`}
                              title={vendor?.user?.status === 'suspended' || vendor?.isActive === false ? 'Reactivate Store' : 'Suspend Store Account'}
                            >
                              {vendor?.user?.status === 'suspended' || vendor?.isActive === false ? 'Reactivate' : 'Suspend'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Complete / Disburse Payout with UTR */}
      {activePayoutForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm">Disburse Merchant Payout</span>
              </div>
              <button onClick={() => setActivePayoutForComplete(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <div><span className="text-slate-500">Merchant Store:</span> <strong className="text-slate-800">{activePayoutForComplete.vendor?.businessName}</strong></div>
              <div><span className="text-slate-500">Payout Amount:</span> <strong className="text-emerald-700 text-sm">{formatINR(activePayoutForComplete.amount)}</strong></div>
              <div><span className="text-slate-500">Target Bank / UPI:</span> <strong className="font-mono">{activePayoutForComplete.bankSnapshot?.upiId || activePayoutForComplete.bankSnapshot?.accountNumber || 'Primary Bank'}</strong></div>
            </div>

            <form onSubmit={handleDisburseWithUTR} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank / Razorpay UTR Reference Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CMS182947192 or UTR-20261023-01"
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Optional Payout Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Net banking IMPS transfer completed"
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                ⚠️ Recording this UTR will immediately mark the payout as completed, decrement the merchant's wallet balance, and post an immutable <strong>DEBIT</strong> to the Ledger.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePayoutForComplete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction || !utrNumber.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {processingAction ? 'Disbursing...' : 'Confirm Disbursement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reject Payout */}
      {activePayoutForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-rose-50 text-rose-700 rounded-2xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span className="font-bold text-sm">Reject Payout Request</span>
              </div>
              <button onClick={() => setActivePayoutForReject(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleRejectPayout} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Bank IFSC code invalid, pending GST document verification, or fraudulent order dispute"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePayoutForReject(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction || !rejectionReason.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {processingAction ? 'Rejecting...' : 'Reject Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: KYC & Identity Inspector Drawer */}
      {inspectVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{inspectVendor.businessName}</h3>
                  <p className="text-xs text-slate-500">Merchant KYC & Verification Dossier</p>
                </div>
              </div>
              <button onClick={() => setInspectVendor(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>

            {/* Account Status Banner */}
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
              inspectVendor?.user?.status === 'suspended' || inspectVendor?.isActive === false
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              <span className="font-bold">
                Account Status: {inspectVendor?.user?.status === 'suspended' || inspectVendor?.isActive === false ? 'SUSPENDED' : 'ACTIVE & VERIFIED'}
              </span>
              <span className="text-[11px] font-mono">ID: {inspectVendor.id.slice(0, 10)}...</span>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Contact Person</span>
                <span className="font-bold text-slate-800">{inspectVendor.contactName || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Registered Phone</span>
                <span className="font-bold text-slate-800 font-mono">{inspectVendor.phone || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Email</span>
                <span className="font-bold text-slate-800 truncate block">{inspectVendor.email || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Store Wallet Balance</span>
                <span className="font-black text-emerald-700 text-sm">{formatINR(inspectVendor.walletBalance)}</span>
              </div>
            </div>

            {/* Tax & Legal Documents */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" /> Statutory & Tax Identifiers
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px] block">GSTIN Number:</span>
                  <strong className="font-mono text-slate-900">{inspectVendor.gstNumber || 'Not Registered'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">PAN Number:</span>
                  <strong className="font-mono text-slate-900">{inspectVendor.panNumber || 'Not Registered'}</strong>
                </div>
              </div>
              <div className="pt-1">
                <span className="text-slate-500 text-[11px] block">Physical Store Address:</span>
                <p className="text-slate-800 font-medium">
                  {[inspectVendor.street, inspectVendor.city, inspectVendor.state, inspectVendor.pincode].filter(Boolean).join(', ') || 'No physical address recorded'}
                </p>
              </div>
            </div>

            {/* Bank Coordinates */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
              <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" /> Settlement Bank Details
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-emerald-700 text-[11px] block">Bank Name:</span>
                  <strong className="font-mono text-slate-900">{inspectVendor.bankName || '—'}</strong>
                </div>
                <div>
                  <span className="text-emerald-700 text-[11px] block">Account Number:</span>
                  <strong className="font-mono text-slate-900">{inspectVendor.accountNumber || '—'}</strong>
                </div>
                <div>
                  <span className="text-emerald-700 text-[11px] block">IFSC Code:</span>
                  <strong className="font-mono text-slate-900">{inspectVendor.ifsc || '—'}</strong>
                </div>
                <div>
                  <span className="text-emerald-700 text-[11px] block">Fast UPI VPA:</span>
                  <strong className="font-mono text-emerald-800">{inspectVendor.upiId || '—'}</strong>
                </div>
              </div>
            </div>

            {/* Uploaded Documents */}
            {inspectVendor.documents && inspectVendor.documents.length > 0 && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-800">Uploaded KYC Proofs</h4>
                <div className="space-y-1.5">
                  {inspectVendor.documents.map((doc: any) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-blue-700 font-semibold"
                    >
                      <span className="truncate">{doc.name || 'KYC Document'}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectVendor(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Account Suspension Confirmation */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-2xl flex items-center gap-2 ${
                suspendTarget.isSuspended ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {suspendTarget.isSuspended ? <UserCheck className="w-5 h-5 text-emerald-600" /> : <UserX className="w-5 h-5 text-rose-600" />}
                <span className="font-bold text-sm">
                  {suspendTarget.isSuspended ? 'Reactivate Store Account' : 'Suspend Store Account'}
                </span>
              </div>
              <button onClick={() => setSuspendTarget(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {suspendTarget.isSuspended ? (
                <>Are you sure you want to <strong>reactivate</strong> store account <strong>"{suspendTarget.name}"</strong>? The merchant will be allowed to receive orders, log into their dashboard, and request payouts.</>
              ) : (
                <>Are you sure you want to <strong>suspend</strong> store account <strong>"{suspendTarget.name}"</strong>? All active orders will halt, products will be hidden from customer search, and login will be blocked until reactivated.</>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleSuspend}
                disabled={suspending}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                  suspendTarget.isSuspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {suspending ? 'Updating...' : suspendTarget.isSuspended ? 'Confirm Reactivation' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
