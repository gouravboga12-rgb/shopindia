import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import {
  Wallet,
  IndianRupee,
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
  Building,
  Banknote,
  Smartphone,
  RefreshCw,
  Info
} from 'lucide-react';

interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export const RiderWallet: React.FC = () => {
  const { token } = useAuth();
  const { profile, refreshData } = useRider();

  // Payout states
  const [method, setMethod] = useState<'bank' | 'upi'>('upi');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [bankAccount, setBankAccount] = useState(profile?.accountNumber || '');
  const [ifsc, setIfsc] = useState(profile?.ifsc || '');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);

  // Sync profile details
  useEffect(() => {
    if (profile?.upiId && !upiId) setUpiId(profile.upiId);
    if (profile?.accountNumber && !bankAccount) setBankAccount(profile.accountNumber);
    if (profile?.ifsc && !ifsc) setIfsc(profile.ifsc);
  }, [profile]);

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const data = await api.get<{ walletBalance?: number; payouts: PayoutItem[] }>('/api/rider/wallet');
      setPayouts(data.payouts || []);
      if (typeof data.walletBalance === 'number') {
        setLiveBalance(data.walletBalance);
      }
      if (refreshData) refreshData();
    } catch (e) {
      console.error('Wallet fetch error', e);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchWallet();
    if (refreshData) await refreshData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchWallet();
  }, [token]);

  // Real-time wallet balance and payout status synchronization
  useSocketEvent('wallet:updated', () => {
    fetchWallet();
  });

  useSocketEvent('payout:updated', () => {
    fetchWallet();
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const currentBal = liveBalance !== null ? liveBalance : (profile?.walletBalance || 0);

    if (currentBal <= 0) {
      setError('Withdrawal is only available when your net wallet balance is positive.');
      return;
    }

    const withdrawAmt = parseFloat(amount);
    if (!withdrawAmt || withdrawAmt <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }
    if (withdrawAmt > currentBal) {
      setError(`Withdrawal amount exceeds your available balance of ₹${Math.floor(currentBal)}.`);
      return;
    }

    if (method === 'upi') {
      if (!upiId || !upiId.trim() || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. mobile@upi or name@okaxis).');
        return;
      }
    } else {
      if (!bankAccount || !ifsc) {
        setError('Bank account and IFSC code are required.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/api/rider/wallet/payout-request', {
        amount: withdrawAmt,
        method,
        upiId: method === 'upi' ? upiId.trim() : undefined,
        bankAccountNumber: method === 'bank' ? bankAccount.trim() : undefined,
        ifscCode: method === 'bank' ? ifsc.trim().toUpperCase() : undefined,
      });

      setSuccess(res.message || `Payout request of ₹${withdrawAmt} submitted! Funds will arrive within 24 hours.`);
      setAmount('');
      if (refreshData) await refreshData();
      await fetchWallet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const effectiveBalance = liveBalance !== null ? liveBalance : (profile?.walletBalance || 0);
  const pocketCash = profile?.codCashFloat || 0;
  const isNegative = effectiveBalance < 0;

  return (
    <div className="space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">
      
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: UNIFIED NET WALLET BALANCE CARD
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className={`flex items-center gap-2 ${isNegative ? 'text-amber-700' : 'text-emerald-700'}`}>
              <div className={`p-1.5 rounded-lg ${isNegative ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                <Wallet className={`w-4 h-4 ${isNegative ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
              <span className="text-xs uppercase font-extrabold tracking-wider">
                {isNegative ? 'Net Wallet Auto-Offset Balance' : 'Total Available Earnings'}
              </span>
            </div>

            <div className={`flex items-center gap-1 text-3xl sm:text-5xl font-black mt-2 ${
              isNegative ? 'text-amber-600' : 'text-slate-900'
            }`}>
              <IndianRupee className={`w-8 h-8 sm:w-11 sm:h-11 stroke-[2.5] ${
                isNegative ? 'text-amber-600' : 'text-emerald-600'
              }`} />
              <span>
                {isNegative
                  ? `-${Math.abs(Math.round(effectiveBalance)).toLocaleString('en-IN')}`
                  : Math.round(effectiveBalance).toLocaleString('en-IN')}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {isNegative
                ? `You hold ₹${Math.round(pocketCash).toLocaleString('en-IN')} customer cash in your pocket. Upcoming order fees will automatically recover this balance.`
                : 'Available balance can be withdrawn instantly to your bank account or UPI.'}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Balance</span>
            </button>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-left sm:text-right">
              <span className="text-xs text-slate-500 font-medium">Lifetime Completed Trips</span>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {profile?.totalDeliveries || 0} Deliveries
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: OFFLINE CASH KEPT IN POCKET (NO REMITTANCE NEEDED)
      ───────────────────────────────────────────────────────────── */}
      {pocketCash > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border-2 bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200 text-orange-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl border shadow-xs shrink-0 bg-orange-500 text-white border-orange-600">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-black uppercase tracking-tight">
                  Cash in Pocket: ₹{Math.round(pocketCash).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  Kept with Rider
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                All physical cash collected on Cash on Delivery orders stays with you. No cash submission or online remittance to admin is required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: INSTANT BANK / UPI WITHDRAWAL FORM
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
            <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Instant Earnings Withdrawal</h3>
        </div>

        {isNegative && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Your net wallet balance is -₹{Math.abs(Math.round(effectiveBalance))}. Please complete more delivery rides to earn fees and clear this balance. If this balance remains uncleared or exceeds the limit, new ride assignments will be paused and your account will be suspended.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Withdrawal Amount (₹)</label>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder={effectiveBalance > 0 ? `Up to ₹${effectiveBalance.toFixed(2)}` : '0'}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={effectiveBalance <= 0}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Payout Destination Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payout Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                disabled={effectiveBalance <= 0}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  method === 'upi'
                    ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI Transfer (Instant)</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('bank')}
                disabled={effectiveBalance <= 0}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                  method === 'bank'
                    ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Bank Account</span>
              </button>
            </div>
          </div>

          {method === 'upi' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UPI ID (VPA)</label>
              <input
                type="text"
                placeholder="e.g. mobile@upi or username@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                disabled={effectiveBalance <= 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white disabled:opacity-50 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">Funds will be credited directly to your UPI-linked bank account.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  placeholder="11-16 digit Account No"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  disabled={effectiveBalance <= 0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white disabled:opacity-50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  disabled={effectiveBalance <= 0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white uppercase disabled:opacity-50 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || effectiveBalance <= 0}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {method === 'upi' ? <Smartphone className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                <span>Submit {method === 'upi' ? 'UPI' : 'Bank'} Withdrawal Request</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: WITHDRAWAL HISTORY
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Withdrawal History</h3>
        {payouts.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium">No withdrawal requests made yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payouts.map((p) => (
              <div key={p.id} className="py-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">₹{p.amount}</span>
                    <p className="text-slate-500">
                      {p.bankAccountNumber?.startsWith('UPI:')
                        ? p.bankAccountNumber
                        : `Bank A/c: ••••${p.bankAccountNumber?.slice(-4) || 'Bank'}`}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        p.status === 'processed' || p.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : p.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : p.status === 'under_review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>

                {/* Show Rejection Reason if rejected */}
                {p.status === 'rejected' && (p.rejectionReason || p.notes) && (
                  <div className="p-2.5 rounded-xl bg-rose-50/90 border border-rose-200/80 text-rose-800 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wider text-[10px] text-rose-900 block">Rejection Reason:</span>
                      <span className="font-medium">{p.rejectionReason || p.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
