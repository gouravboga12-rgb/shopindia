import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import { Package, CheckCircle2, Store, MapPin } from 'lucide-react';

interface HistoryOrder {
  id: string;
  orderNumber: string;
  status: string;
  deliveryFee: number;
  pickupName: string;
  dropoffName: string;
  deliveredAt?: string;
  createdAt: string;
}

export const RiderOrders: React.FC = () => {
  const { token } = useAuth();
  const { activeDelivery } = useRider();
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await api.get<{ history: HistoryOrder[] }>('/api/rider/orders/history');
        setHistoryOrders(data.history || []);
      } catch (e) {
        console.error('Failed to fetch rider order history', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">
      
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Your Deliveries</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track active assignments and completed trip earnings</p>
        </div>
      </div>

      {/* Active Delivery Highlight if present */}
      {activeDelivery && (
        <div className="bg-white border-2 border-orange-400 rounded-2xl sm:rounded-3xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              In Progress
            </span>
            <span className="text-emerald-600 font-black text-lg sm:text-xl">₹{activeDelivery.deliveryFee}</span>
          </div>

          <h3 className="text-base font-bold text-slate-900">
            Order #{activeDelivery.order?.orderNumber || activeDelivery.orderId.slice(0, 8)}
          </h3>

          <div className="mt-3 text-xs text-slate-700 space-y-1.5">
            <p className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="truncate font-medium">{activeDelivery.pickupName}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate font-medium">{activeDelivery.dropoffName}</span>
            </p>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Completed Trips History</h3>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading trips...</div>
        ) : historyOrders.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs text-slate-500 font-medium">No completed trips yet. Start accepting orders on Radar!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyOrders.map((order) => (
              <div key={order.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-900">#{order.orderNumber}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate max-w-[200px] sm:max-w-md">
                    {order.pickupName} ➔ {order.dropoffName}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(order.deliveredAt || order.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-emerald-600">+₹{order.deliveryFee}</span>
                  <span className="block text-[10px] text-slate-400 font-medium">Credited</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
