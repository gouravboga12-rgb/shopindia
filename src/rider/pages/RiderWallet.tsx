import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import { Wallet, IndianRupee, ArrowDownToLine, CheckCircle2, AlertCircle, Building } from 'lucide-react';

interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  createdAt: string;
}

export const RiderWallet: React.FC = () => {
  const { token } = useAuth();
  const { profile, refreshData } = useRider();
  const [amount, setAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/rider/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch (e) {
      console.error('Wallet fetch error', e);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [token]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const withdrawAmt = parseFloat(amount);
    if (!withdrawAmt || withdrawAmt <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }
    if (withdrawAmt > (profile?.walletBalance || 0)) {
      setError('Withdrawal amount exceeds your current wallet balance.');
      return;
    }
    if (!bankAccount || !ifsc) {
      setError('Bank account and IFSC code are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rider/wallet/payout-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: withdrawAmt,
          bankAccountNumber: bankAccount,
          ifscCode: ifsc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payout request failed');

      setSuccess(`Payout request of ₹${withdrawAmt} submitted! Funds will arrive within 24 hours.`);
      setAmount('');
      await refreshData();
      await fetchWallet();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">
      
      {/* Wallet Balance Hero Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs uppercase font-extrabold tracking-wider">Total Available Balance</span>
            </div>
            <div className="flex items-center gap-1 text-3xl sm:text-5xl font-black text-slate-900 mt-2">
              <IndianRupee className="w-8 h-8 sm:w-11 sm:h-11 text-emerald-600 stroke-[2.5]" />
              <span>{(profile?.walletBalance || 0).toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Credited in real time after every verified OTP customer delivery.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left sm:text-right">
            <span className="text-xs text-slate-500 font-medium">Total Lifetime Earnings</span>
            <p className="text-lg font-black text-slate-900 mt-0.5">
              ₹{((profile?.totalDeliveries || 0) * 60).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Payout Withdrawal Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
            <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Instant Bank Withdrawal</h3>
        </div>

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
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                placeholder="11-16 digit Account No"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white uppercase transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !profile?.walletBalance || profile.walletBalance <= 0}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Building className="w-4 h-4" />
                <span>Submit Withdrawal Request</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Payout History */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Withdrawal History</h3>
        {payouts.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium">No withdrawal requests made yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {payouts.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 text-sm">₹{p.amount}</span>
                  <p className="text-slate-500">Account: ••••{p.bankAccountNumber?.slice(-4) || 'Bank'}</p>
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
                      p.status === 'processed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
