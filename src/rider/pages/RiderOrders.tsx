import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import { Package, CheckCircle2, Store, MapPin, Banknote, Building2, CreditCard, Clock, RefreshCw } from 'lucide-react';

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

interface CODHistoryItem {
  id: string;
  amount: number;
  clearanceMode: string;
  status: string;
  displayStatus: string;
  statusColor: string;
  createdAt: string;
  receivedByAdminAt?: string;
  razorpayPaymentId?: string;
  notes?: string;
  regionalAdmin?: {
    name: string;
    phone?: string;
    hubName: string;
  } | null;
}

export const RiderOrders: React.FC = () => {
  const { token } = useAuth();
  const { activeDelivery } = useRider();
  const [activeTab, setActiveTab] = useState<'trips' | 'cod_history'>('trips');
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [codHistory, setCodHistory] = useState<CODHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCod, setLoadingCod] = useState(false);

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

  const fetchCODHistory = async () => {
    if (!token) return;
    setLoadingCod(true);
    try {
      const res: any = await api.get('/api/rider/cod/history');
      if (res?.success) {
        setCodHistory(res.history || []);
      }
    } catch (e) {
      console.error('Failed to fetch rider COD remittance history', e);
    } finally {
      setLoadingCod(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cod_history' && codHistory.length === 0) {
      fetchCODHistory();
    }
  }, [activeTab]);

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

      {/* Dual History Card: Completed Deliveries VS COD Remittance History */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('trips')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'trips'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Completed Trips ({historyOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cod_history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'cod_history'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>COD Clearance Passbook ({codHistory.length})</span>
            </button>
          </div>

          {activeTab === 'cod_history' && (
            <button
              type="button"
              onClick={fetchCODHistory}
              disabled={loadingCod}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Refresh COD History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCod ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* TAB 1: COMPLETED TRIPS */}
        {activeTab === 'trips' && (
          <div>
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
        )}

        {/* TAB 2: COD CLEARANCE & HANDOVER PASSBOOK */}
        {activeTab === 'cod_history' && (
          <div>
            {loadingCod ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading cash clearance passbook...</div>
            ) : codHistory.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Banknote className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-600 font-bold">No COD clearances or handovers recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">When you submit cash to Regional Admin or pay via Razorpay, receipts will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {codHistory.map((item) => (
                  <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        item.clearanceMode === 'online'
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.clearanceMode === 'online' ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {item.clearanceMode === 'online'
                              ? 'Online Remittance (Razorpay UPI)'
                              : `Hub Handover: ${item.regionalAdmin?.name || 'Regional Hub Manager'}`}
                          </span>
                          
                          {item.status === 'verified' || item.receivedByAdminAt ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Accepted by Hub
                            </span>
                          ) : item.clearanceMode === 'online' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Settled Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 animate-pulse text-amber-600" />
                              Pending Hub Acceptance
                            </span>
                          )}
                        </div>

                        {item.regionalAdmin?.hubName && (
                          <p className="text-[11px] text-slate-500 font-medium">
                            Hub: {item.regionalAdmin.hubName} {item.regionalAdmin.phone ? `(📞 ${item.regionalAdmin.phone})` : ''}
                          </p>
                        )}

                        {item.razorpayPaymentId && (
                          <p className="text-[10.5px] font-mono text-blue-600">
                            Payment ID: {item.razorpayPaymentId}
                          </p>
                        )}

                        {item.notes && (
                          <p className="text-[10.5px] text-slate-500 italic">
                            Note: {item.notes}
                          </p>
                        )}

                        <span className="text-[10px] text-slate-400 block">
                          Submitted on {new Date(item.createdAt).toLocaleString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 pl-11 sm:pl-0">
                      <span className="text-base font-black text-slate-900 font-mono">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </span>
                      <span className={`block text-[10px] font-bold ${
                        item.status === 'verified' || item.receivedByAdminAt || item.clearanceMode === 'online'
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}>
                        {item.status === 'verified' || item.receivedByAdminAt || item.clearanceMode === 'online'
                          ? 'Cash Float Decremented'
                          : 'Awaiting Hub Approval'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
