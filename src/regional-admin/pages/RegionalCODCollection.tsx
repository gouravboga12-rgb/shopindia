import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Banknote,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Bike,
  Building2,
  CreditCard,
  History
} from 'lucide-react';

interface RiderUser {
  name: string;
  phone: string;
  email?: string;
}

interface RiderProfileData {
  id: string;
  user: RiderUser;
}

interface RemittanceRecord {
  id: string;
  amount: number;
  status: 'pending' | 'received_by_regional' | 'remitted_to_super';
  clearanceMode: string;
  notes?: string;
  createdAt: string;
  receivedByAdminAt?: string;
  remittedToSuperAt?: string;
  superAdminRazorpayId?: string;
  riderProfile: RiderProfileData;
}

interface CODResponse {
  success: boolean;
  hubName: string;
  totalCashInCustody: number;
  pendingCount: number;
  pendingSubmissions: RemittanceRecord[];
  collectedPool: RemittanceRecord[];
  pastRemittances: RemittanceRecord[];
}

export const RegionalCODCollection: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CODResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'custody' | 'history'>('pending');

  // Confirmation modal state
  const [confirmingRecord, setConfirmingRecord] = useState<RemittanceRecord | null>(null);
  const [confirmNotes, setConfirmNotes] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Selection for bulk remittance
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRemitting, setIsRemitting] = useState<boolean>(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCODData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<CODResponse>('/api/regional-admin/cod');
      if (res.success) {
        setData(res);
        // Default select all in collected pool for convenient remittance
        setSelectedIds(res.collectedPool.map((c) => c.id));
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

  const handleConfirmReceipt = async () => {
    if (!confirmingRecord) return;
    setIsConfirming(true);
    setErrorMessage(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/api/regional-admin/cod/${confirmingRecord.id}/confirm-receipt`,
        { notes: confirmNotes }
      );
      if (res.success) {
        setSuccessMessage(res.message);
        setConfirmingRecord(null);
        setConfirmNotes('');
        setTimeout(() => setSuccessMessage(null), 4000);
        await fetchCODData();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to confirm receipt');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRemitToSuperAdmin = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one cash batch to remit.');
      return;
    }

    setIsRemitting(true);
    setErrorMessage(null);

    try {
      // 1. Create Razorpay order
      const orderRes = await api.post<{
        success: boolean;
        orderId: string;
        amount: number;
        totalINR: number;
        keyId: string;
        remittanceIds: string[];
      }>('/api/regional-admin/cod/create-super-remittance-order', {
        remittanceIds: selectedIds,
      });

      if (!orderRes.success) throw new Error('Order creation failed');

      // 2. Open Razorpay modal
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Razorpay SDK is loading. Please try again in a few moments.');
        setIsRemitting(false);
        return;
      }

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: 'INR',
        name: 'ShopIndia Super Admin Remittance',
        description: `Regional Cash Remittance for ${selectedIds.length} batch(es)`,
        order_id: orderRes.orderId,
        prefill: {
          name: user?.name || 'Regional Admin',
          email: user?.email || '',
        },
        theme: {
          color: '#0F2C59',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await api.post<{ success: boolean; message: string }>(
              '/api/regional-admin/cod/verify-super-remittance',
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                remittanceIds: selectedIds,
              }
            );

            if (verifyRes.success) {
              setSuccessMessage('Physical cash pool remitted to Super Admin nodal account via Razorpay!');
              setTimeout(() => setSuccessMessage(null), 5000);
              await fetchCODData();
            }
          } catch (verr: unknown) {
            setErrorMessage(verr instanceof Error ? verr.message : 'Verification failed');
          } finally {
            setIsRemitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsRemitting(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to initiate Razorpay transfer');
      setIsRemitting(false);
    }
  };

  const toggleSelectBatch = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === (data?.collectedPool.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data?.collectedPool.map((c) => c.id) || []);
    }
  };

  const selectedTotal =
    data?.collectedPool
      .filter((c) => selectedIds.includes(c.id))
      .reduce((acc, c) => acc + c.amount, 0) || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/80">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Cash on Delivery (COD) Remittance Hub
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Territory cash reception from delivery fleet and bulk nodal remittance to Super Admin.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCODData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Hub</span>
        </button>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-semibold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hub Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-[#0F2C59] to-[#1E3A8A] text-white p-5 rounded-2xl sm:rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-white/70 text-xs font-bold uppercase tracking-wider">
            <span>Physical Cash in Custody</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black mt-2 font-mono text-emerald-300">
            ₹{(data?.totalCashInCustody || 0).toLocaleString('en-IN')}
          </p>
          <div className="text-[11px] text-white/60 mt-1 flex items-center gap-1 font-medium">
            <span>Hub: {data?.hubName || 'Regional Hub'}</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Pending Rider Submissions</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2 font-mono">
            {data?.pendingCount || 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting physical handover</span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Super Admin Remittance</span>
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Transfer collected cash pool to Super Admin via instant Razorpay settlement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('custody')}
            className="mt-3 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View Custody Pool</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Handovers ({data?.pendingSubmissions.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custody')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'custody'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Cash in Custody Pool ({data?.collectedPool.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Remittance History ({data?.pastRemittances.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: PENDING HANDOVERS QUEUE */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Riders Awaiting Physical Cash Handover
            </h2>
            <span className="text-xs text-slate-500">Verify handover OTP before receiving physical cash</span>
          </div>

          {data?.pendingSubmissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm font-semibold text-slate-700">No pending handovers</p>
              <p className="text-xs text-slate-400 mt-1">All territory riders have either cleared online or have zero pending cash.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.pendingSubmissions.map((record) => (
                <div key={record.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {record.riderProfile?.user?.name || 'Rider Partner'}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {record.riderProfile?.user?.phone} • {record.riderProfile?.user?.email}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Requested: {new Date(record.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {record.notes && (
                        <div className="mt-1.5 inline-block text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {record.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cash Amount</span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        ₹{record.amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingRecord(record);
                        setConfirmNotes(`Verified physical handover of ₹${record.amount} from ${record.riderProfile?.user?.name}`);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Confirm Cash Received
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CASH IN CUSTODY POOL */}
      {activeTab === 'custody' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden space-y-4">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Cash Pool in Regional Custody (Pending Remittance to HQ)
              </h2>
              <p className="text-xs text-slate-500">
                Select batches to remit directly to Super Admin nodal account via Razorpay.
              </p>
            </div>

            {data && data.collectedPool.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  {selectedIds.length === data.collectedPool.length ? 'Deselect All' : 'Select All'}
                </button>

                <button
                  type="button"
                  disabled={selectedIds.length === 0 || isRemitting}
                  onClick={handleRemitToSuperAdmin}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isRemitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5" />
                  )}
                  <span>Remit Selected (₹{selectedTotal.toLocaleString('en-IN')}) via Razorpay</span>
                </button>
              </div>
            )}
          </div>

          {data?.collectedPool.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-blue-500 opacity-60" />
              <p className="text-sm font-semibold text-slate-700">Custody Pool is Empty</p>
              <p className="text-xs text-slate-400 mt-1">
                All physical cash received from riders has been successfully remitted to Super Admin!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.collectedPool.map((batch) => {
                const isChecked = selectedIds.includes(batch.id);
                return (
                  <div
                    key={batch.id}
                    onClick={() => toggleSelectBatch(batch.id)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by row click
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {batch.riderProfile?.user?.name || 'Rider Partner'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Received on{' '}
                          {batch.receivedByAdminAt
                            ? new Date(batch.receivedByAdminAt).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Confirmed'}
                        </div>
                        {batch.notes && <div className="text-[10px] text-slate-500 mt-0.5">{batch.notes}</div>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-slate-900 font-mono">
                        ₹{batch.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-emerald-600 font-semibold uppercase">
                        In Regional Custody
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REMITTANCE HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Past Completed Remittances to HQ</h2>
          </div>

          {data?.pastRemittances.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No historical remittances found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.pastRemittances.map((hist) => (
                <div key={hist.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      Rider: {hist.riderProfile?.user?.name || 'Rider'}
                    </div>
                    <div className="text-slate-400 text-[11px] font-mono">
                      Remitted at:{' '}
                      {hist.remittedToSuperAt
                        ? new Date(hist.remittedToSuperAt).toLocaleString('en-IN')
                        : 'Settled'}
                    </div>
                    {hist.superAdminRazorpayId && (
                      <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                        Razorpay Payment: {hist.superAdminRazorpayId}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-slate-900">
                      ₹{hist.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="block text-[10px] text-emerald-600 font-bold uppercase">
                      Settled to HQ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Confirm Physical Cash Receipt</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              You are confirming physical receipt of cash from{' '}
              <strong className="text-slate-800">{confirmingRecord.riderProfile?.user?.name}</strong>. This decrements the rider's COD float and transfers custody liability to you until remitted to Super Admin.
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Amount to Accept:</span>
                <span className="font-mono font-black text-emerald-600 text-base">
                  ₹{confirmingRecord.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Rider Phone:</span>
                <span className="font-mono text-slate-800">{confirmingRecord.riderProfile?.user?.phone}</span>
              </div>
              {confirmingRecord.notes && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Handover Note:</span>
                  <span className="font-mono text-blue-700 font-bold">{confirmingRecord.notes}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Notes
              </label>
              <textarea
                rows={2}
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingRecord(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={handleConfirmReceipt}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isConfirming && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Accept Cash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
