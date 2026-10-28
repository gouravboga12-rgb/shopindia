import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import { api } from '../../lib/api';
import {
  Wallet,
  IndianRupee,
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
  Building,
  Banknote,
  ShieldAlert,
  CreditCard,
  Building2,
  RefreshCw,
  KeyRound,
  Smartphone
} from 'lucide-react';

interface PayoutItem {
  id: string;
  amount: number;
  status: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  createdAt: string;
}

interface CODStatus {
  floatAmount: number;
  floatLimit: number;
  unremittedCount: number;
  deadlineRule: string;
  orderCountThreshold: number;
  regionalAdminAvailable: boolean;
  regionalAdmin?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    hubName?: string;
  } | null;
  clearanceNotice: string;
  isBlocked: boolean;
  warningMessage?: string | null;
  recentDeliveries?: Array<{
    id: string;
    deliveryFee: number;
    createdAt: string;
    order?: { id: string; orderNumber: string; total: number };
  }>;
}

export const RiderWallet: React.FC = () => {
  const { token, user } = useAuth();
  const { profile, refreshData } = useRider();

  // Payout states
  const [method, setMethod] = useState<'bank' | 'upi'>('upi');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [bankAccount, setBankAccount] = useState(profile?.accountNumber || '');
  const [ifsc, setIfsc] = useState(profile?.ifsc || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);

  // Sync profile details
  useEffect(() => {
    if (profile?.upiId && !upiId) setUpiId(profile.upiId);
    if (profile?.accountNumber && !bankAccount) setBankAccount(profile.accountNumber);
    if (profile?.ifsc && !ifsc) setIfsc(profile.ifsc);
  }, [profile]);

  // COD Clearance states
  const [codStatus, setCodStatus] = useState<CODStatus | null>(null);
  const [codLoading, setCodLoading] = useState<boolean>(true);
  const [isPayingRazorpay, setIsPayingRazorpay] = useState<boolean>(false);
  const [isRequestingHandover, setIsRequestingHandover] = useState<boolean>(false);
  const [handoverOtp, setHandoverOtp] = useState<string | null>(null);
  const [handoverDetails, setHandoverDetails] = useState<{ name: string; hubName: string } | null>(null);
  const [codSuccess, setCodSuccess] = useState<string | null>(null);
  const [codError, setCodError] = useState<string | null>(null);

  const fetchWallet = async () => {
    if (!token) return;
    try {
      const data = await api.get<{ payouts: PayoutItem[] }>('/api/rider/wallet');
      setPayouts(data.payouts || []);
    } catch (e) {
      console.error('Wallet fetch error', e);
    }
  };

  const fetchCODStatus = async () => {
    setCodLoading(true);
    setCodError(null);
    try {
      const res = await api.get<CODStatus & { success: boolean }>('/api/rider/cod/status');
      if (res.success) {
        setCodStatus(res);
      }
    } catch (e: unknown) {
      console.error('COD status fetch error:', e);
      setCodError(e instanceof Error ? e.message : 'Failed to fetch COD clearance status');
    } finally {
      setCodLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
    fetchCODStatus();
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

  // Online Razorpay Remittance
  const handlePayRazorpay = async () => {
    if (!codStatus || codStatus.floatAmount <= 0) return;
    setIsPayingRazorpay(true);
    setCodError(null);
    setCodSuccess(null);

    try {
      const orderRes = await api.post<{
        success: boolean;
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        rider: { name: string; email: string; phone: string };
      }>('/api/rider/cod/create-razorpay-order', {});

      if (!orderRes.success) throw new Error('Could not initiate remittance order');

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Razorpay SDK is loading. Please try again in a few moments.');
        setIsPayingRazorpay(false);
        return;
      }

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'ShopIndia COD Clearance',
        description: `Clearance of ₹${codStatus.floatAmount} offline cash float`,
        order_id: orderRes.orderId,
        prefill: {
          name: orderRes.rider?.name || user?.name || 'Rider',
          email: orderRes.rider?.email || user?.email || '',
          contact: orderRes.rider?.phone || '',
        },
        theme: {
          color: '#EA580C',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await api.post<{ success: boolean; message: string; clearedAmount: number }>(
              '/api/rider/cod/verify-razorpay-remittance',
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }
            );

            if (verifyRes.success) {
              setCodSuccess(verifyRes.message);
              setHandoverOtp(null);
              await refreshData();
              await fetchCODStatus();
            }
          } catch (verr: unknown) {
            setCodError(verr instanceof Error ? verr.message : 'Payment verification failed');
          } finally {
            setIsPayingRazorpay(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPayingRazorpay(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      setCodError(err instanceof Error ? err.message : 'Failed to start payment');
      setIsPayingRazorpay(false);
    }
  };

  // Physical Handover Request
  const handleRequestHandover = async () => {
    setIsRequestingHandover(true);
    setCodError(null);
    setCodSuccess(null);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        handoverOtp: string;
        amount: number;
        regionalAdmin: { name: string; hubName: string };
      }>('/api/rider/cod/request-physical-handover', {});

      if (res.success) {
        setHandoverOtp(res.handoverOtp);
        setHandoverDetails(res.regionalAdmin);
        setCodSuccess(res.message);
      }
    } catch (err: unknown) {
      setCodError(err instanceof Error ? err.message : 'Failed to request physical handover');
    } finally {
      setIsRequestingHandover(false);
    }
  };

  const floatAmount = codStatus?.floatAmount ?? profile?.codCashFloat ?? 0;
  const floatLimit = codStatus?.floatLimit ?? profile?.codFloatLimit ?? 3000;
  const isBlocked = codStatus?.isBlocked ?? (floatAmount >= floatLimit);

  return (
    <div className="space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">
      
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: COD FLOATING CASH IN HAND & CLEARANCE ENGINE
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-2 border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden space-y-5">
        
        {/* Header & Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${
              isBlocked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-orange-50 text-orange-600 border-orange-200'
            }`}>
              <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Cash in Hand (COD Float)
                </h2>
                {isBlocked ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Radar Paused
                  </span>
                ) : floatAmount > floatLimit * 0.75 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">
                    Near Limit
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Compliant
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Customer cash collected on deliveries awaiting platform clearance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchCODStatus}
            disabled={codLoading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${codLoading ? 'animate-spin' : ''}`} />
            <span>Sync Float</span>
          </button>
        </div>

        {/* Warning Banner if blocked or near limit */}
        {codStatus?.warningMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
            isBlocked
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{codStatus.warningMessage}</span>
          </div>
        )}

        {/* Success / Error Feedback */}
        {codSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{codSuccess}</span>
          </div>
        )}
        {codError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{codError}</span>
          </div>
        )}

        {/* Float Amounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Floating Cash in Hand
            </span>
            <div className="flex items-center gap-1 text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
              <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 stroke-[2.5]" />
              <span>{floatAmount.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Limit: ₹{floatLimit.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Unremitted COD Orders
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-mono">
              {codStatus?.unremittedCount ?? 0}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Policy: {codStatus?.deadlineRule === 'order_count'
                ? `Max ${codStatus.orderCountThreshold} orders`
                : 'End of Day (Midnight)'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Regional Admin Support
            </span>
            <div className="text-sm font-black text-slate-800 mt-1">
              {codStatus?.regionalAdminAvailable
                ? codStatus.regionalAdmin?.name || 'Active at Hub'
                : 'Not Available in Zone'}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {codStatus?.regionalAdminAvailable ? codStatus.regionalAdmin?.hubName || 'Local Hub' : 'Online Razorpay Only'}
            </span>
          </div>
        </div>

        {/* Clearance Handover OTP Banner (if generated) */}
        {handoverOtp && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl space-y-2 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>Physical Handover Verification Code</span>
            </div>
            <div className="text-3xl font-black font-mono tracking-widest text-blue-700">
              {handoverOtp}
            </div>
            <p className="text-xs text-blue-800">
              Please share this 4-digit code with{' '}
              <strong>{handoverDetails?.name || 'your Regional Admin'}</strong> at{' '}
              <strong>{handoverDetails?.hubName || 'the Hub'}</strong> when handing over ₹{floatAmount} in cash.
            </p>
          </div>
        )}

        {/* Clearance Action Buttons */}
        {floatAmount > 0 ? (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Clearance Method
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Pay Online via Razorpay */}
              <button
                type="button"
                disabled={isPayingRazorpay}
                onClick={handlePayRazorpay}
                className="p-4 rounded-2xl border-2 border-orange-500 bg-orange-50/40 hover:bg-orange-100/60 transition-all text-left group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-orange-500 text-white rounded-xl shadow-xs">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 uppercase bg-orange-100 px-2 py-0.5 rounded-full">
                    Instant Unblock
                  </span>
                </div>
                <div className="font-black text-slate-900 text-sm">
                  Pay ₹{floatAmount.toLocaleString('en-IN')} via Razorpay
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  UPI, Cards, Netbanking. Instantly clears your float so you can receive orders.
                </p>
              </button>

              {/* Option 2: Submit Physical Cash to Regional Admin */}
              {codStatus?.regionalAdminAvailable ? (
                <button
                  type="button"
                  disabled={isRequestingHandover}
                  onClick={handleRequestHandover}
                  className="p-4 rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-left group cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-slate-800 text-white rounded-xl shadow-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                      Physical Handover
                    </span>
                  </div>
                  <div className="font-black text-slate-900 text-sm">
                    Submit Cash to Regional Admin
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Hand over physical cash to {codStatus.regionalAdmin?.name || 'Hub Manager'}. Generates a secure 4-digit OTP.
                  </p>
                </button>
              ) : (
                <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/80 text-left opacity-80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Building2 className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Physical Submission</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      No Regional Admin available in your area. Please pay through Razorpay.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-orange-600 font-bold mt-2">
                    Online remittance mandatory
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero pending cash in hand! Your COD clearance status is in perfect standing.</span>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: RIDER EARNINGS WALLET BALANCE & WITHDRAWAL
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs uppercase font-extrabold tracking-wider">Total Available Earnings</span>
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

      {/* Instant Bank Withdrawal Form */}
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

          {/* Payout Destination Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payout Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
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
          )}

          <button
            type="submit"
            disabled={loading || !profile?.walletBalance || profile.walletBalance <= 0}
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
