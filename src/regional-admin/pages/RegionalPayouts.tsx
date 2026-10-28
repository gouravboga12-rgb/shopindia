import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  ShieldCheck, RefreshCw, Zap
} from 'lucide-react';

interface TerritoryPayoutRequest {
  id: string;
  partyType: 'VENDOR' | 'RIDER';
  partyId: string;
  amount: number;
  status: string;
  requestedAt: string;
  notes?: string;
  bankSnapshot?: any;
  vendor?: any;
  riderProfile?: any;
}

export const RegionalPayouts: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [requests, setRequests] = useState<TerritoryPayoutRequest[]>([]);
  const [territory, setTerritory] = useState<string>('');
  const [assignedPincodes, setAssignedPincodes] = useState<string[]>([]);

  // Action state
  const [selectedPayout, setSelectedPayout] = useState<TerritoryPayoutRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'escalate' | 'reject'>('approve');
  const [verificationNote, setVerificationNote] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadTerritoryPayouts = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/api/regional-admin/payouts');
      if (res?.requests) setRequests(res.requests);
      if (res?.territory) setTerritory(res.territory);
      if (res?.assignedPincodes) setAssignedPincodes(res.assignedPincodes);
    } catch (err: any) {
      console.error('Failed to load regional payouts:', err);
      setMessage({ text: err.message || 'Failed to fetch territory payouts.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerritoryPayouts();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout) return;

    try {
      setProcessing(true);
      const res: any = await api.post(`/api/regional-admin/payouts/${selectedPayout.id}/verify`, {
        action: actionType,
        note: verificationNote.trim(),
      });
      if (res?.success) {
        setMessage({ text: res.message || 'Payout verified and updated for Super Admin.' });
        setSelectedPayout(null);
        setVerificationNote('');
        loadTerritoryPayouts();
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Verification failed.', isError: true });
    } finally {
      setProcessing(false);
    }
  };

  const formatINR = (val?: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Territory Partner Payout Approvals
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Region: <span className="font-bold text-gray-800">{territory || 'Assigned Territory'}</span>
            {assignedPincodes.length > 0 && (
              <span className="text-xs text-gray-400 ml-1">({assignedPincodes.length} Pincodes covered)</span>
            )}
          </p>
        </div>

        <button
          onClick={loadTerritoryPayouts}
          disabled={loading}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info notice explaining territory filtering */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
        <span className="text-base">ℹ️</span>
        <div>
          <p className="font-bold">Strict Territory Verification Queue</p>
          <p className="text-[11px] text-blue-700 mt-0.5">
            This queue exclusively receives payout requests from vendors and riders within your assigned pincodes ({assignedPincodes.join(', ') || 'No pincodes assigned'}). Partner requests from other regions or unassigned territories route directly to the Super Admin.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            message.isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Payouts Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
            Loading territory partner payouts...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs space-y-2">
            <p className="text-gray-600 font-semibold text-sm">
              No pending partner payout requests inside {territory || 'your assigned territory'}.
            </p>
            <p className="text-[11px] text-gray-400">
              Partner payout requests originating outside your territory route directly to the Super Admin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Partner Name</th>
                  <th className="py-3 px-4">Amount Requested</th>
                  <th className="py-3 px-4">Ledger Balance</th>
                  <th className="py-3 px-4">Disbursement Mode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r: any) => {
                  const partnerName =
                    r.partyType === 'VENDOR'
                      ? r.vendor?.businessName || 'Merchant'
                      : r.riderProfile?.user?.name || 'Rider';
                  const city = r.partyType === 'VENDOR' ? r.vendor?.city : r.riderProfile?.address;
                  const currentBalance =
                    r.partyType === 'VENDOR'
                      ? r.vendor?.walletBalance || 0
                      : r.riderProfile?.walletBalance || 0;

                  const snapshot = r.bankSnapshot || {};
                  const upiId = snapshot.upiId || (r.partyType === 'VENDOR' ? r.vendor?.upiId : r.riderProfile?.upiId);
                  const bankAcc = snapshot.accountNumber || (r.partyType === 'VENDOR' ? r.vendor?.accountNumber : r.riderProfile?.accountNumber);

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{partnerName}</span>
                          <span className="px-1.5 py-0.2 rounded font-bold text-[9.5px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Territory
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-sm">
                          <span className="uppercase text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-gray-100 text-gray-600">
                            {r.partyType}
                          </span>{' '}
                          • {city || 'Territory Partner'}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-black text-gray-900 text-sm">
                        {formatINR(r.amount)}
                      </td>

                      <td className="py-3 px-4 font-semibold text-gray-700">
                        {formatINR(currentBalance)}
                      </td>

                      <td className="py-3 px-4">
                        {upiId ? (
                          <div className="font-mono text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                            <Zap className="w-3 h-3 text-emerald-600" />
                            {upiId}
                          </div>
                        ) : bankAcc ? (
                          <div className="font-mono text-gray-600 text-[11px]">
                            A/C ••••{String(bankAcc).slice(-4)}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No bank saved</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'approved'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPayout(r);
                              setActionType('approve');
                              setVerificationNote('Partner identity, order deliveries, and store activity verified by Regional Lead.');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                          >
                            Verify & Forward
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPayout(r);
                              setActionType('escalate');
                              setVerificationNote('Discrepancy found or verification failed. Escalating directly to Super Admin for manual intervention.');
                            }}
                            className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-[11px] transition-all cursor-pointer"
                            title="Escalate directly to Super Admin if verification fails"
                          >
                            Escalate to Super Admin
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPayout(r);
                              setActionType('reject');
                              setVerificationNote('');
                            }}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[11px] transition-all cursor-pointer"
                          >
                            Reject
                          </button>
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

      {/* VERIFICATION MODAL */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                {actionType === 'approve'
                  ? 'Verify & Forward to Super Admin'
                  : actionType === 'escalate'
                  ? 'Escalate Directly to Super Admin'
                  : 'Reject Partner Payout'}
              </h3>
              <button
                onClick={() => setSelectedPayout(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Action Mode Toggle */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setActionType('approve');
                  if (!verificationNote || verificationNote.includes('Escalating') || verificationNote.includes('failed')) {
                    setVerificationNote('Partner identity, order deliveries, and store activity verified by Regional Lead.');
                  }
                }}
                className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  actionType === 'approve' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Verify & Forward
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionType('escalate');
                  if (!verificationNote || verificationNote.includes('verified')) {
                    setVerificationNote('Discrepancy found during local verification. Forwarding to Super Admin for manual override.');
                  }
                }}
                className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  actionType === 'escalate' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Escalate (Failure)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionType('reject');
                  setVerificationNote('');
                }}
                className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  actionType === 'reject' ? 'bg-white text-rose-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Reject
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Partner:</span>
                <span className="font-bold text-gray-900">
                  {selectedPayout.partyType === 'VENDOR'
                    ? selectedPayout.vendor?.businessName
                    : selectedPayout.riderProfile?.user?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requested Amount:</span>
                <span className="font-black text-gray-900 text-sm">
                  {formatINR(selectedPayout.amount)}
                </span>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {actionType === 'approve'
                    ? 'Regional Verification Note *'
                    : actionType === 'escalate'
                    ? 'Failure Findings / Reason for Escalation to Super Admin *'
                    : 'Rejection Reason *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    actionType === 'approve'
                      ? 'e.g. Partner identity verified, deliveries confirmed with zero customer disputes...'
                      : actionType === 'escalate'
                      ? 'e.g. Partner phone unreachable or bank mismatch found. Requesting Super Admin manual review...'
                      : 'e.g. Suspected fraudulent orders or invalid documentation...'
                  }
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayout(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !verificationNote.trim()}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
                    actionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : actionType === 'escalate'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processing
                    ? 'Submitting...'
                    : actionType === 'approve'
                    ? 'Verify & Forward'
                    : actionType === 'escalate'
                    ? 'Escalate to Super Admin'
                    : 'Reject Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
