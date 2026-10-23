import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Wallet, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, ShieldCheck, Zap
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

interface PayoutsPageProps {
  onOpenStatement?: (partyType: string, partyId: string, name: string) => void;
}

export const PayoutsPage: React.FC<PayoutsPageProps> = ({ onOpenStatement }) => {
  const [queue, setQueue] = useState<'all' | 'vendor' | 'rider'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/api/admin/payouts?queue=${queue}&status=${statusFilter}`);
      if (res?.requests) setRequests(res.requests);
      if (res?.stats) setStats(res.stats);
    } catch (err: any) {
      console.error('Failed to load payouts:', err);
      setActionMessage({ text: err.message || 'Failed to load payout queue.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, [queue, statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingAction(true);
      const res: any = await api.post(`/api/admin/payouts/${id}/approve`, {
        notes: 'Approved by Super Admin for bank disbursement',
      });
      if (res?.success) {
        setActionMessage({ text: 'Payout request approved.' });
        loadPayouts();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to approve payout.', isError: true });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCompletePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayoutForComplete || !utrNumber.trim()) return;

    try {
      setProcessingAction(true);
      const res: any = await api.post(`/api/admin/payouts/${activePayoutForComplete.id}/complete`, {
        utr: utrNumber.trim(),
        notes: payoutNotes.trim(),
      });
      if (res?.success) {
        setActionMessage({ text: res.message || 'Payout marked paid with UTR recorded.' });
        setActivePayoutForComplete(null);
        setUtrNumber('');
        setPayoutNotes('');
        loadPayouts();
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to disburse payout.', isError: true });
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
        setActionMessage({ text: 'Payout request rejected.' });
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

  const formatINR = (val?: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            Unified Partner Payout Queues
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review, verify, and disburse bank & UPI withdrawals for Merchants, Delivery Riders, and Home Technicians.
          </p>
        </div>

        <button
          onClick={loadPayouts}
          disabled={loading}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm transition-all flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queues
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            actionMessage.isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase tracking-wider">
            <span>Pending Clearance</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900 font-heading">
            {formatINR(stats?.pendingAmount)}
          </div>
          <p className="text-[11px] text-gray-500">{stats?.pendingCount || 0} requests awaiting review</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-100 bg-blue-50/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase tracking-wider">
            <span>Approved / Ready To Disburse</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-heading">
            {formatINR(stats?.approvedAmount)}
          </div>
          <p className="text-[11px] text-gray-500">{stats?.approvedCount || 0} verified by regional leads</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <span>Total Disbursed (Completed)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-900 font-heading">
            {formatINR(stats?.completedAmount)}
          </div>
          <p className="text-[11px] text-gray-500">{stats?.completedCount || 0} payments completed via IMPS/UPI</p>
        </div>
      </div>

      {/* Queue Tabs and Status Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        {/* Queue Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setQueue('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              queue === 'all'
                ? 'bg-[#0F2C59] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Queues
          </button>
          <button
            onClick={() => setQueue('vendor')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              queue === 'vendor'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Vendors / Merchants
          </button>
          <button
            onClick={() => setQueue('rider')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              queue === 'rider'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Riders & Technicians
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-sm focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed (Paid)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
            Loading payout requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No payout requests found for this filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Partner Details</th>
                  <th className="py-3 px-4">Amount Requested</th>
                  <th className="py-3 px-4">Available Ledger Balance</th>
                  <th className="py-3 px-4">Bank / Fast UPI Details</th>
                  <th className="py-3 px-4">Requested Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => {
                  const partnerName =
                    r.partyType === 'VENDOR'
                      ? r.vendor?.businessName || 'Merchant'
                      : r.riderProfile?.user?.name || 'Rider';
                  const phone =
                    r.partyType === 'VENDOR' ? r.vendor?.phone : r.riderProfile?.user?.phone;
                  const currentBalance =
                    r.partyType === 'VENDOR'
                      ? r.vendor?.walletBalance || 0
                      : r.riderProfile?.walletBalance || 0;

                  const snapshot = r.bankSnapshot || {};
                  const upiId = snapshot.upiId || (r.partyType === 'VENDOR' ? r.vendor?.upiId : r.riderProfile?.upiId);
                  const bankAcc = snapshot.accountNumber || (r.partyType === 'VENDOR' ? r.vendor?.accountNumber : r.riderProfile?.accountNumber);
                  const ifsc = snapshot.ifsc || (r.partyType === 'VENDOR' ? r.vendor?.ifsc : r.riderProfile?.ifsc);

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      {/* Partner Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{partnerName}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <span className="uppercase text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-gray-100 text-gray-600">
                            {r.partyType}
                          </span>
                          {phone && <span>• {phone}</span>}
                        </div>
                      </td>

                      {/* Requested Amount */}
                      <td className="py-3 px-4 font-black text-gray-900 text-sm">
                        {formatINR(r.amount)}
                      </td>

                      {/* Ledger Balance */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-700">{formatINR(currentBalance)}</div>
                        {currentBalance < r.amount ? (
                          <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Insufficient Balance
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">Fully Covered</span>
                        )}
                      </td>

                      {/* Bank Details */}
                      <td className="py-3 px-4">
                        {upiId && (
                          <div className="text-emerald-700 font-mono font-bold text-[11px] flex items-center gap-1">
                            <Zap className="w-3 h-3 text-emerald-600" />
                            {upiId}
                          </div>
                        )}
                        {bankAcc && (
                          <div className="text-gray-500 text-[11px] font-mono">
                            A/C: ••••{String(bankAcc).slice(-4)} • {ifsc || '—'}
                          </div>
                        )}
                        {!upiId && !bankAcc && <span className="text-gray-400 italic">No bank saved</span>}
                      </td>

                      {/* Requested At */}
                      <td className="py-3 px-4 text-gray-500">
                        {new Date(r.requestedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {r.notes && (
                          <div className="text-[10px] text-blue-600 mt-0.5 truncate max-w-[140px]" title={r.notes}>
                            {r.notes}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : r.status === 'approved'
                              ? 'bg-blue-50 text-blue-700'
                              : r.status === 'rejected'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.razorpayPayoutId && (
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            UTR: {r.razorpayPayoutId}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenStatement && (
                            <button
                              onClick={() => onOpenStatement(r.partyType, r.partyId, partnerName)}
                              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] transition-all"
                              title="View Passbook Statement"
                            >
                              Statement
                            </button>
                          )}

                          {r.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={processingAction}
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-all"
                            >
                              Approve
                            </button>
                          )}

                          {r.status !== 'completed' && r.status !== 'rejected' && (
                            <button
                              onClick={() => {
                                setActivePayoutForComplete(r);
                                setUtrNumber('');
                                setPayoutNotes('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all"
                            >
                              Mark Paid
                            </button>
                          )}

                          {r.status === 'pending' && (
                            <button
                              onClick={() => {
                                setActivePayoutForReject(r);
                                setRejectionReason('');
                              }}
                              className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[11px] transition-all"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: MARK PAID / DISBURSE WITH UTR */}
      {activePayoutForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Record Payout Disbursement
              </h3>
              <button
                onClick={() => setActivePayoutForComplete(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Amount to Disburse:</span>
                <span className="font-black text-gray-900 text-sm">
                  {formatINR(activePayoutForComplete.amount)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Recipient UPI ID:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {activePayoutForComplete.bankSnapshot?.upiId || 'Direct Bank NEFT/IMPS'}
                </span>
              </div>
            </div>

            <form onSubmit={handleCompletePayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Bank / UPI Transaction Reference (UTR) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 429381029381 or CMS1293849102"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Disbursement Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via Corporate NetBanking / IMPS"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500">
                Confirming will automatically post an immutable <strong>PAYOUT DEBIT</strong> in the partner's double-entry ledger and deduct their available wallet balance.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePayoutForComplete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction || !utrNumber.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {processingAction ? 'Processing...' : 'Confirm & Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT PAYOUT */}
      {activePayoutForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Reject Payout Request
              </h3>
              <button
                onClick={() => setActivePayoutForReject(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Bank IFSC code invalid, pending unresolved dispute, or name mismatch on bank account..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePayoutForReject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction || !rejectionReason.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {processingAction ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
