import React, { useEffect, useState } from 'react';
import { TrendingUp, Store, Bike, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';

export interface PlatformTreasury {
  adminProfit: number;
  grossCustomerPaid: number;
  pendingVendorPayout: number;
  pendingRiderPayout: number;
  totalVendorPaidOut: number;
  totalRiderPaidOut: number;
  totalPaidOut: number;
}

interface TreasuryBannerProps {
  initialTreasury?: PlatformTreasury | null;
  className?: string;
  onRefresh?: () => void;
}

const fmt = (n: number | undefined | null) => new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
}).format(n || 0);

export const TreasuryBanner: React.FC<TreasuryBannerProps> = ({
  initialTreasury,
  className = '',
  onRefresh,
}) => {
  const [treasury, setTreasury] = useState<PlatformTreasury | null>(initialTreasury || null);
  const [loading, setLoading] = useState(!initialTreasury);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (initialTreasury) {
      setTreasury(initialTreasury);
      setLoading(false);
    }
  }, [initialTreasury]);

  const fetchBalances = async () => {
    try {
      setIsRefreshing(true);
      const res = await api.get<{ success: boolean; treasury: PlatformTreasury }>('/api/admin/finance/balances');
      if (res && res.treasury) {
        setTreasury(res.treasury);
      }
    } catch (e) {
      console.warn('Failed to fetch treasury balances:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialTreasury) {
      fetchBalances();
    }
  }, []);

  // Real-time synchronization whenever payouts or orders are updated
  useSocketEvent<PlatformTreasury>('treasury:updated', (data) => {
    if (data && typeof data.adminProfit === 'number') {
      setTreasury(data);
    }
  });

  const handleManualRefresh = () => {
    fetchBalances();
    if (onRefresh) onRefresh();
  };

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/60 relative overflow-hidden ${className}`}>
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Live Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-700/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">Platform Financial Treasury</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Reconciled
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live reconciliation of Admin Profit, Wholesale Merchant Payables, Delivery Fleet Payables, and Cleared Disbursements
            </p>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-600 transition-colors shadow-sm"
          title="Refresh platform treasury balances"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* 4 Core Financial KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {/* 1. Admin Net Profit */}
        <div className="bg-slate-800/70 hover:bg-slate-800/90 border border-emerald-500/30 rounded-xl p-4 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Admin Profit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-numbers tracking-tight">
              {loading ? '...' : `₹${fmt(treasury?.adminProfit)}`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Platform Margin Retained</span>
            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Net Earnings</span>
          </div>
        </div>

        {/* 2. Amount Pending to Vendors */}
        <div className="bg-slate-800/70 hover:bg-slate-800/90 border border-amber-500/30 rounded-xl p-4 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Pending to Vendors</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-200 font-numbers tracking-tight">
              {loading ? '...' : `₹${fmt(treasury?.pendingVendorPayout)}`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Wholesale Merchant Dues</span>
            <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded">Left to Clear</span>
          </div>
        </div>

        {/* 3. Amount Pending to Riders & Technicians */}
        <div className="bg-slate-800/70 hover:bg-slate-800/90 border border-indigo-500/30 rounded-xl p-4 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Pending to Riders</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-200 font-numbers tracking-tight">
              {loading ? '...' : `₹${fmt(treasury?.pendingRiderPayout)}`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Delivery & Job Earnings</span>
            <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">Left to Clear</span>
          </div>
        </div>

        {/* 4. Total Cleared / Paid Out */}
        <div className="bg-slate-800/70 hover:bg-slate-800/90 border border-sky-500/30 rounded-xl p-4 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">Total Paid Out</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-200 font-numbers tracking-tight">
              {loading ? '...' : `₹${fmt(treasury?.totalPaidOut)}`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-300 truncate" title={`Vendors: ₹${fmt(treasury?.totalVendorPaidOut)} • Fleet: ₹${fmt(treasury?.totalRiderPaidOut)}`}>
              Vendors: ₹{fmt(treasury?.totalVendorPaidOut)} • Fleet: ₹{fmt(treasury?.totalRiderPaidOut)}
            </span>
            <span className="text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded ml-1 whitespace-nowrap">Cleared</span>
          </div>
        </div>
      </div>
    </div>
  );
};

