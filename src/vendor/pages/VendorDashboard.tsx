import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ShoppingBag, DollarSign, Wallet, Clock } from 'lucide-react';

export const VendorDashboard: React.FC = () => {
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
