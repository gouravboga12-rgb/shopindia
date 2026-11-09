import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import {
  Package, CheckCircle2, Store, MapPin, Banknote, CreditCard, RefreshCw,
  Wrench, Calendar, Clock, AlertTriangle, X, Phone, Navigation, AlertCircle,
  MessageSquare, ExternalLink
} from 'lucide-react';

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

interface ScheduledServiceItem {
  id: string;
  orderId: string;
  status: string;
  deliveryFee: number;
  distanceKm: number;
  deliveryOtp?: string;
  pickupName: string;
  pickupAddress: string;
  dropoffName: string;
  dropoffAddress: string;
  dropoffPhone?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  order?: {
    id: string;
    orderNumber: string;
    total: number;
    notes?: string;
    customer?: {
      id: string;
      name: string;
      phone: string;
    };
    items?: Array<{ id: string; name: string; quantity: number }>;
  };
}

interface RiderOrdersProps {
  initialTab?: 'trips' | 'cod_history' | 'scheduled_services';
}

// Helper to determine trade badge & styling from service title / items
function getTradeBadge(pickupName: string, items?: Array<{ name: string }>) {
  const text = `${pickupName || ''} ${(items || []).map(i => i.name).join(' ')}`.toLowerCase();
  if (text.includes('plumb')) return { label: 'Plumbing & Sanitary Care', icon: '🔧', color: 'bg-blue-100 text-blue-900 border-blue-200' };
  if (text.includes('electr') || text.includes('wiring') || text.includes('switch')) return { label: 'Electrician & Home Wiring', icon: '⚡', color: 'bg-amber-100 text-amber-900 border-amber-200' };
  if (text.includes('ac') || text.includes('cooling') || text.includes('hvac')) return { label: 'AC Repair & Service', icon: '❄️', color: 'bg-teal-100 text-teal-900 border-teal-200' };
  if (text.includes('clean') || text.includes('pest')) return { label: 'Deep Cleaning & Pest', icon: '✨', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
  if (text.includes('appliance') || text.includes('machine') || text.includes('refrigerator')) return { label: 'Appliance Maintenance', icon: '🧺', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
  if (text.includes('carpent') || text.includes('wood')) return { label: 'Carpentry & Assembly', icon: '🪚', color: 'bg-orange-100 text-orange-900 border-orange-200' };
  if (text.includes('paint')) return { label: 'Painting & Seepage', icon: '🎨', color: 'bg-purple-100 text-purple-900 border-purple-200' };
  return { label: 'Glacons Doorstep Service', icon: '🛠️', color: 'bg-slate-100 text-slate-800 border-slate-200' };
}

export const RiderOrders: React.FC<RiderOrdersProps> = ({ initialTab = 'trips' }) => {
  const { token } = useAuth();
  const { activeDelivery, startServiceJob } = useRider();
  const [startingServiceId, setStartingServiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trips' | 'cod_history' | 'scheduled_services'>(initialTab);
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
  const [codHistory, setCodHistory] = useState<CODHistoryItem[]>([]);
  const [scheduledServices, setScheduledServices] = useState<ScheduledServiceItem[]>([]);
  const [groupedServices, setGroupedServices] = useState<{
    today: ScheduledServiceItem[];
    tomorrow: ScheduledServiceItem[];
    upcoming: ScheduledServiceItem[];
  }>({
    today: [],
    tomorrow: [],
    upcoming: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadingCod, setLoadingCod] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  // Cancellation Modal State
  const [serviceToCancel, setServiceToCancel] = useState<ScheduledServiceItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSlotExpired, setIsSlotExpired] = useState(false);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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

  const fetchScheduledServices = async () => {
    if (!token) return;
    setLoadingServices(true);
    try {
      const res: any = await api.get('/api/rider/orders/scheduled-services').catch(() => api.get('/api/rider/scheduled-services'));
      if (res?.success) {
        setScheduledServices(res.services || []);
        if (res.grouped) {
          setGroupedServices(res.grouped);
        }
      }
    } catch (e) {
      console.error('Failed to fetch scheduled services', e);
    } finally {
      setLoadingServices(false);
    }
  };

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
    fetchScheduledServices();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'cod_history' && codHistory.length === 0) {
      fetchCODHistory();
    } else if (activeTab === 'scheduled_services') {
      fetchScheduledServices();
    }
  }, [activeTab]);

  const handleCancelService = async () => {
    if (!serviceToCancel) return;
    if (!cancelReason || cancelReason.trim().length < 5) {
      alert('Please enter a specific explanation (at least 5 characters). This is transparently shared with the customer.');
      return;
    }
    setSubmittingCancel(true);
    try {
      const res: any = await api.post(`/api/rider/orders/${serviceToCancel.id}/cancel-service`, {
        reason: cancelReason,
        isExpired: isSlotExpired,
      });
      if (res?.success) {
        showToast(res.message || 'Service appointment cancelled. Automatically re-broadcasted for a replacement technician.');
        setServiceToCancel(null);
        setCancelReason('');
        setIsSlotExpired(false);
        fetchScheduledServices();
      } else {
        alert(res?.error || 'Failed to cancel appointment.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to cancel service appointment.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMsg.message}</span>
        </div>
      )}
      
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

          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-orange-100 text-orange-900 border border-orange-300 font-black rounded-lg text-xs font-mono shadow-2xs">
              Token: #{(activeDelivery.order?.orderNumber || activeDelivery.orderId || '').replace(/^OD-/, '').slice(-4) || '9786'}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Order #{activeDelivery.order?.orderNumber || activeDelivery.orderId.slice(0, 8)}
            </h3>
          </div>

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
              <span>COD Passbook ({codHistory.length})</span>
            </button>

            {/* Dedicated Scheduled Services Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('scheduled_services')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'scheduled_services'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Scheduled Services ({scheduledServices.length})</span>
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

          {activeTab === 'scheduled_services' && (
            <button
              type="button"
              onClick={fetchScheduledServices}
              disabled={loadingServices}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Refresh Scheduled Services"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingServices ? 'animate-spin' : ''}`} />
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
                {historyOrders.map((order: any) => {
                  const rawOrderNo = order.orderNumber || order.order?.orderNumber || (order.orderId ? order.orderId.slice(0, 8) : '') || (order.id ? order.id.slice(0, 8) : '');
                  const token = (order.orderNumber || order.order?.orderNumber || '').replace(/^OD-/, '').slice(-4) || (rawOrderNo ? rawOrderNo.slice(-4) : '9786');
                  return (
                    <div key={order.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-900 border border-orange-300 font-black rounded text-[10px] font-mono">
                            Token: #{token}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-none">
                            Order #{rawOrderNo}
                          </span>
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COD STATEMENT PASSBOOK (AUTO-OFFSET ARCHITECTURE) */}
        {activeTab === 'cod_history' && (
          <div>
            {loadingCod ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading cash on delivery statement...</div>
            ) : codHistory.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Banknote className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-600 font-bold">No Cash on Delivery entries recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">When you deliver COD orders and collect cash, your collection and auto-offset statements will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {codHistory.map((item: any) => {
                  const isCollection = item.entryType === 'cash_collection' || item.clearanceMode === 'customer_cash';

                  return (
                    <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          isCollection
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isCollection ? <Banknote className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {isCollection ? 'Customer Cash Collected' : 'Online Float Settlement (UPI)'}
                            </span>

                            {item.token && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-900 border border-orange-300 font-black rounded text-[10px] font-mono">
                                Token: #{item.token}
                              </span>
                            )}

                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isCollection
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {item.displayStatus || (isCollection ? 'Cash in Pocket (Auto-Offset)' : 'Settled Online')}
                            </span>
                          </div>

                          {item.orderNumber && (
                            <p className="text-[11px] font-mono text-slate-600 font-bold">
                              Order #{item.orderNumber}
                            </p>
                          )}

                          {item.pickupName && item.dropoffName && (
                            <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                              {item.pickupName} ➔ {item.dropoffName}
                            </p>
                          )}

                          {item.razorpayPaymentId && (
                            <p className="text-[10.5px] font-mono text-blue-600">
                              Razorpay ID: {item.razorpayPaymentId}
                            </p>
                          )}

                          {isCollection && typeof item.feeEarned === 'number' && (
                            <div className="flex items-center gap-2 text-[10.5px] text-slate-500 font-medium pt-0.5">
                              <span className="text-emerald-700 font-bold">Fee Earned: +₹{item.feeEarned}</span>
                              <span>•</span>
                              <span className="text-amber-800 font-bold">Pocketed Cash: ₹{item.amount}</span>
                            </div>
                          )}

                          <span className="text-[10px] text-slate-400 block pt-0.5">
                            {new Date(item.createdAt).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0 pl-11 sm:pl-0">
                        {isCollection ? (
                          <>
                            <span className="text-base font-black text-amber-700 font-mono">
                              ₹{Number(item.amount).toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[10px] font-bold text-amber-600">
                              Net Offset: {item.netImpact > 0 ? `+₹${item.netImpact}` : `-₹${Math.abs(item.netImpact)}`}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-base font-black text-emerald-600 font-mono">
                              +₹{Number(item.amount).toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[10px] font-bold text-emerald-600">
                              Float Decremented
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCHEDULED SERVICES (TODAY, TOMORROW, UPCOMING) */}
        {activeTab === 'scheduled_services' && (
          <div className="space-y-6">
            {/* Header info banner */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-teal-950">Scheduled Service Roster</h4>
                  <p className="text-xs text-teal-800">
                    Glacons doorstep appointments accepted by you. Organized by schedule.
                  </p>
                </div>
              </div>
            </div>

            {loadingServices ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading scheduled service roster...</div>
            ) : scheduledServices.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Wrench className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No scheduled service appointments yet.</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  When customers book Glacons home & HVAC services nearby, claim them on your Radar!
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. TODAY'S APPOINTMENTS */}
                {groupedServices.today.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">
                        Today's Appointments ({groupedServices.today.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {groupedServices.today.map((srv) => {
                        const trade = getTradeBadge(srv.pickupName, srv.order?.items);
                        const cleanPhone = (srv.dropoffPhone || srv.order?.customer?.phone || '').replace(/\D/g, '');
                        const mapsUrl = srv.dropoffLat && srv.dropoffLng
                          ? `https://www.google.com/maps/dir/?api=1&destination=${srv.dropoffLat},${srv.dropoffLng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(srv.dropoffAddress || '')}`;

                        return (
                          <div
                            key={srv.id}
                            className="bg-white border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${trade.color}`}>
                                  <span>{trade.icon}</span>
                                  <span>{trade.label}</span>
                                </span>
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 font-numbers">
                                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>{srv.order?.notes || srv.pickupAddress || 'Today'}</span>
                                </span>
                              </div>
                              <span className="text-emerald-700 font-black text-base font-numbers bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                +₹{srv.deliveryFee} Payout
                              </span>
                            </div>

                            <div>
                              <h5 className="font-extrabold text-base text-slate-900">{srv.pickupName}</h5>
                              <p className="text-xs text-slate-600 mt-1 flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{srv.dropoffAddress || 'Customer Doorstep'}</span>
                              </p>
                            </div>

                            {/* Customer Contact & Navigation Bar (Fully Unlocked Post-Acceptance) */}
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-semibold">Customer Details:</span>
                                <span className="font-black text-slate-900">{srv.dropoffName} {cleanPhone ? `(${cleanPhone})` : ''}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                                {cleanPhone && (
                                  <>
                                    <a
                                      href={`tel:${cleanPhone}`}
                                      className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                      title="Call Customer"
                                    >
                                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Call</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${srv.dropoffName}, I am your ShopIndia service technician for your appointment today (${srv.pickupName}).`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                      title="WhatsApp Customer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </>
                                )}
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                  title="Google Maps Navigation"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Maps</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </a>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  setStartingServiceId(srv.id);
                                  await startServiceJob(srv.id);
                                  setStartingServiceId(null);
                                }}
                                disabled={startingServiceId === srv.id}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                {startingServiceId === srv.id ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Starting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>🚀 Start Work & Travel to Site</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setServiceToCancel(srv)}
                                className="px-3.5 py-2.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. TOMORROW'S APPOINTMENTS */}
                {groupedServices.tomorrow.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-800">
                        Tomorrow's Appointments ({groupedServices.tomorrow.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {groupedServices.tomorrow.map((srv) => {
                        const trade = getTradeBadge(srv.pickupName, srv.order?.items);
                        const cleanPhone = (srv.dropoffPhone || srv.order?.customer?.phone || '').replace(/\D/g, '');
                        const mapsUrl = srv.dropoffLat && srv.dropoffLng
                          ? `https://www.google.com/maps/dir/?api=1&destination=${srv.dropoffLat},${srv.dropoffLng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(srv.dropoffAddress || '')}`;

                        return (
                          <div
                            key={srv.id}
                            className="bg-white border-2 border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${trade.color}`}>
                                  <span>{trade.icon}</span>
                                  <span>{trade.label}</span>
                                </span>
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 font-numbers">
                                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                                  <span>{srv.order?.notes || srv.pickupAddress || 'Tomorrow'}</span>
                                </span>
                              </div>
                              <span className="text-emerald-700 font-black text-base font-numbers bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                +₹{srv.deliveryFee} Payout
                              </span>
                            </div>

                            <div>
                              <h5 className="font-extrabold text-base text-slate-900">{srv.pickupName}</h5>
                              <p className="text-xs text-slate-600 mt-1 flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{srv.dropoffAddress || 'Customer Doorstep'}</span>
                              </p>
                            </div>

                            {/* Customer Contact & Navigation Bar (Fully Unlocked Post-Acceptance) */}
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-semibold">Customer Details:</span>
                                <span className="font-black text-slate-900">{srv.dropoffName} {cleanPhone ? `(${cleanPhone})` : ''}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                                {cleanPhone && (
                                  <>
                                    <a
                                      href={`tel:${cleanPhone}`}
                                      className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                      title="Call Customer"
                                    >
                                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Call</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${srv.dropoffName}, I am your ShopIndia service technician assigned for your appointment tomorrow (${srv.pickupName}).`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                      title="WhatsApp Customer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </>
                                )}
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                  title="Google Maps Navigation"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Maps</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </a>
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => setServiceToCancel(srv)}
                                className="px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                Cancel Service
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. UPCOMING APPOINTMENTS */}
                {groupedServices.upcoming.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Upcoming Future Dates ({groupedServices.upcoming.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {groupedServices.upcoming.map((srv) => {
                        const trade = getTradeBadge(srv.pickupName, srv.order?.items);
                        const cleanPhone = (srv.dropoffPhone || srv.order?.customer?.phone || '').replace(/\D/g, '');
                        const mapsUrl = srv.dropoffLat && srv.dropoffLng
                          ? `https://www.google.com/maps/dir/?api=1&destination=${srv.dropoffLat},${srv.dropoffLng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(srv.dropoffAddress || '')}`;

                        return (
                          <div
                            key={srv.id}
                            className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${trade.color}`}>
                                  <span>{trade.icon}</span>
                                  <span>{trade.label}</span>
                                </span>
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 font-numbers">
                                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                                  <span>{srv.order?.notes || srv.pickupAddress || 'Upcoming Slot'}</span>
                                </span>
                              </div>
                              <span className="text-emerald-700 font-black text-base font-numbers bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                +₹{srv.deliveryFee} Payout
                              </span>
                            </div>

                            <div>
                              <h5 className="font-extrabold text-base text-slate-900">{srv.pickupName}</h5>
                              <p className="text-xs text-slate-600 mt-1 flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span>{srv.dropoffAddress || 'Customer Doorstep'}</span>
                              </p>
                            </div>

                            {/* Customer Contact & Navigation Bar (Fully Unlocked Post-Acceptance) */}
                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-semibold">Customer Details:</span>
                                <span className="font-black text-slate-900">{srv.dropoffName} {cleanPhone ? `(${cleanPhone})` : ''}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
                                {cleanPhone && (
                                  <>
                                    <a
                                      href={`tel:${cleanPhone}`}
                                      className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                      title="Call Customer"
                                    >
                                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Call</span>
                                    </a>
                                    <a
                                      href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${srv.dropoffName}, I am your ShopIndia service technician assigned for your upcoming appointment (${srv.pickupName}).`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                      title="WhatsApp Customer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>WhatsApp</span>
                                    </a>
                                  </>
                                )}
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                  title="Google Maps Navigation"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Maps</span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </a>
                              </div>
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => setServiceToCancel(srv)}
                                className="px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                Cancel Service
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MANDATORY CANCELLATION REASON PROMPT MODAL */}
      {serviceToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-left">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-sm sm:text-base text-slate-950">Cancel Service Appointment</h3>
              </div>
              <button
                onClick={() => {
                  setServiceToCancel(null);
                  setCancelReason('');
                  setIsSlotExpired(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transparent Notice */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Reason is Mandatory & Transparent
              </span>
              <p className="text-xs text-rose-900 leading-relaxed font-medium">
                The customer will see the exact explanation you write here. If cancelled before the appointment time, our automated system will immediately re-broadcast this job to find a replacement technician.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                Reason for Cancellation (Min. 5 characters) *
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. My bike broke down on the main road, or urgent family emergency..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none transition-all"
              />
            </div>

            <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isSlotExpired}
                onChange={(e) => setIsSlotExpired(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-[11px] text-slate-600 font-medium">
                Appointment time slot has already passed / customer was not reachable (triggers automated customer refund)
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setServiceToCancel(null);
                  setCancelReason('');
                  setIsSlotExpired(false);
                }}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleCancelService}
                disabled={submittingCancel || cancelReason.trim().length < 5}
                className="py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {submittingCancel ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
