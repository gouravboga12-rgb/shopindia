import React, { useState, useEffect } from 'react';
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
        const res = await fetch('/api/rider/orders/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistoryOrders(data.history || []);
        }
      } catch (e) {
        console.error('Failed to fetch rider order history', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  return (
    <div className="space-y-5 pb-24 text-slate-100 animate-in fade-in duration-200">
      
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Your Deliveries</h2>
          <p className="text-xs text-slate-400">Track assigned jobs and completed order history</p>
        </div>
      </div>

      {/* Active Delivery Highlight if present */}
      {activeDelivery && (
        <div className="bg-slate-900 border border-orange-500/40 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-950/80 px-2.5 py-0.5 rounded-full border border-orange-500/30">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              In Progress
            </span>
            <span className="text-emerald-400 font-extrabold text-lg">₹{activeDelivery.deliveryFee}</span>
          </div>

          <h3 className="text-base font-bold text-white">
            Order #{activeDelivery.order?.orderNumber || activeDelivery.orderId.slice(0, 8)}
          </h3>

          <div className="mt-3 text-xs text-slate-300 space-y-1.5">
            <p className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="truncate">{activeDelivery.pickupName}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{activeDelivery.dropoffName}</span>
            </p>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Completed Trips History</h3>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs">Loading trips...</div>
        ) : historyOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No completed trips yet. Start accepting orders on Radar!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {historyOrders.map((order) => (
              <div key={order.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">#{order.orderNumber}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-md">
                    {order.pickupName} ➔ {order.dropoffName}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {new Date(order.deliveredAt || order.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-emerald-400">+₹{order.deliveryFee}</span>
                  <span className="block text-[10px] text-slate-500">Credited</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
