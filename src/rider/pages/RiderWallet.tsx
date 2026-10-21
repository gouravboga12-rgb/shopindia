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
    <div className="space-y-6 pb-24 text-slate-100 animate-in fade-in duration-200">
      
      {/* Wallet Balance Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400">
              <Wallet className="w-5 h-5" />
              <span className="text-xs uppercase font-bold tracking-wider">Total Available Balance</span>
            </div>
            <div className="flex items-center gap-1 text-4xl sm:text-5xl font-black text-white mt-2">
              <IndianRupee className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-400 stroke-[2.5]" />
              <span>{(profile?.walletBalance || 0).toLocaleString('en-IN')}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Credited in real time after every verified OTP customer delivery.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 text-right">
            <span className="text-xs text-slate-400">Total Lifetime Payouts</span>
            <p className="text-lg font-bold text-slate-200 mt-0.5">
              ₹{((profile?.totalDeliveries || 0) * 60).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* Payout Withdrawal Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-orange-400" />
          <h3 className="text-base font-bold text-white">Instant Bank Withdrawal</h3>
        </div>

        {error && (
          <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleWithdraw} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Withdrawal Amount (₹)</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Account Number</label>
              <input
                type="text"
                placeholder="11-16 digit Account No"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">IFSC Code</label>
              <input
                type="text"
                placeholder="HDFC0001234"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !profile?.walletBalance || profile.walletBalance <= 0}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Withdrawal History</h3>
        {payouts.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No withdrawal requests made yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {payouts.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white text-sm">₹{p.amount}</span>
                  <p className="text-slate-400">Account: ••••{p.bankAccountNumber?.slice(-4) || 'Bank'}</p>
                  <span className="text-[10px] text-slate-500">
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
                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      p.status === 'processed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-950 text-amber-400 border border-amber-500/30'
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
