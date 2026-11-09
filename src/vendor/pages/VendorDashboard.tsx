import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ShoppingBag, DollarSign, Wallet, Clock, Power } from 'lucide-react';
import { useVendor } from '../context/VendorContext';

export const VendorDashboard: React.FC = () => {
  const { isOnline, toggleOnline, toggling } = useVendor();
  const [data, setData] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>('/api/vendor/analytics/summary').catch(() => null),
      api.get<any>('/api/vendor/wallet').catch(() => null),
    ]).then(([analyticsRes, walletRes]) => {
      setData(analyticsRes);
      setWallet(walletRes);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-40 skeleton-shimmer rounded-2xl" />;
  }

  const pendingCount = data?.ordersByStatus
    ?.filter((s: any) => !['delivered', 'cancelled', 'refunded'].includes(s._id))
    ?.reduce((sum: number, s: any) => sum + s.count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Live Store Online / Offline Control Banner */}
      {isOnline ? (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Power className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Store is LIVE on ShopIndia Dispatch Network
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Accepting Orders
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Nearby customers within your delivery radius can browse and place orders. You will be alerted when new orders arrive.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleOnline(false)}
            disabled={toggling}
            className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-semibold bg-white text-gray-700 hover:text-amber-800 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 transition-all cursor-pointer whitespace-nowrap shadow-2xs flex items-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5 text-amber-600" />
            <span>Pause Store (Go Offline)</span>
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50/50 to-white border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Store is Currently OFFLINE
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Paused
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Your store is currently not taking orders. Turn your store online whenever you're ready to accept orders and service bookings.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleOnline(true)}
            disabled={toggling}
            className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Open Store (Go Online)</span>
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendor Overview</h1>
        <p className="text-sm text-gray-500">Track your product sales, fulfillment pipeline, and wallet balance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 font-numbers">₹{data?.allTime?.total || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 font-numbers">{data?.allTime?.count || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Pending Orders</p>
            <p className="text-2xl font-bold text-gray-900 font-numbers">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Wallet Balance</p>
            <p className="text-2xl font-bold text-gray-900 font-numbers">₹{wallet?.walletBalance || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
