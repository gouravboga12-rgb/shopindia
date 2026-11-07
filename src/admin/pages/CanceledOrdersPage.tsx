import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  AlertOctagon, Search, RefreshCw, Phone, MessageSquare,
  CheckCircle2, AlertTriangle, ShieldCheck, CreditCard,
  Building2, Calendar, MapPin, Zap, Banknote
} from 'lucide-react';

interface CanceledOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  type: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentRef?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  deliveryLine1?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryPincode?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  vendor?: {
    id?: string;
    businessName?: string;
    phone?: string;
    city?: string;
    state?: string;
  };
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export const CanceledOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<CanceledOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending_refund' | 'refunded' | 'cod'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Refund Confirmation Modal
  const [refundOrder, setRefundOrder] = useState<CanceledOrder | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundNotes, setRefundNotes] = useState<string>('');

  const loadCanceledOrders = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/api/admin/orders?status=cancelled&limit=100');
      // Also fetch orders with status 'refunded' so admin can review both
      const refRes: any = await api.get('/api/admin/orders?status=refunded&limit=100');
      const combined = [...(res.orders || []), ...(refRes.orders || [])];
      
      // Deduplicate by ID
      const seen = new Set();
      const unique = combined.filter(o => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });

      // Sort newest first
      unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(unique);
    } catch (err: any) {
      console.error('Failed to load canceled orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCanceledOrders();
  }, []);

  const handleOpenRefundModal = (o: CanceledOrder) => {
    setRefundOrder(o);
    setRefundAmount(o.total || 0);
    setRefundNotes(o.refundReason || 'Order cancelled by store. Processing full refund via Razorpay.');
  };

  const handleExecuteRefund = async () => {
    if (!refundOrder) return;
    setProcessingId(refundOrder.id);
    try {
      const res: any = await api.post(`/api/admin/orders/${refundOrder.id}/refund`, {
        refundAmount,
        refundReason: refundNotes,
      });
      setActionSuccess(res.message || 'Refund successfully executed via Razorpay!');
      setRefundOrder(null);
      loadCanceledOrders();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to process Razorpay refund');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.phone?.includes(q) ||
      o.vendor?.businessName?.toLowerCase().includes(q) ||
      o.deliveryCity?.toLowerCase().includes(q) ||
      o.deliveryPincode?.includes(q);

    if (!matchSearch) return false;

    const isPrepaid = o.paymentMethod === 'razorpay' || o.paymentMethod === 'online';
    const isCOD = o.paymentMethod === 'cod' || o.paymentMethod === 'COD';

    if (paymentFilter === 'pending_refund') {
      return isPrepaid && o.paymentStatus !== 'refunded';
    }
    if (paymentFilter === 'refunded') {
      return o.paymentStatus === 'refunded';
    }
    if (paymentFilter === 'cod') {
      return isCOD;
    }
    return true;
  });

  const pendingRefundTotal = orders
    .filter(o => (o.paymentMethod === 'razorpay' || o.paymentMethod === 'online') && o.paymentStatus !== 'refunded')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-gray-900 flex items-center gap-2.5">
            <AlertOctagon className="w-7 h-7 text-red-600" />
            Canceled Orders & Refunds Maintenance
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track rejected and canceled orders, verify store rejection reasons, contact customers directly via Phone or WhatsApp, and trigger 1-click Razorpay refunds.
          </p>
        </div>

        <button
          onClick={loadCanceledOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Canceled Orders</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{orders.length}</span>
            <span className="text-xs text-gray-400">Recorded</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Prepaid Refunds</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">
              ₹{pendingRefundTotal.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-amber-700 font-bold">
              ({orders.filter(o => (o.paymentMethod === 'razorpay' || o.paymentMethod === 'online') && o.paymentStatus !== 'refunded').length} orders)
            </span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Refunds Settled via Razorpay</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">
              {orders.filter(o => o.paymentStatus === 'refunded').length}
            </span>
            <span className="text-xs text-emerald-600 font-bold">Completed</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, customer phone, vendor name, area, pincode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Canceled' },
            { id: 'pending_refund', label: 'Pending Refund 💳' },
            { id: 'refunded', label: 'Refunded ✓' },
            { id: 'cod', label: 'Cash on Delivery (No Refund)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPaymentFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                paymentFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            Loading canceled orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-gray-400">
            No canceled orders found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5">Order Details</th>
                  <th className="px-4 py-3.5">Customer & WhatsApp</th>
                  <th className="px-4 py-3.5">Area / Pincode</th>
                  <th className="px-4 py-3.5">Assigned Vendor</th>
                  <th className="px-4 py-3.5">Store Rejection Reason</th>
                  <th className="px-4 py-3.5">Payment & Value</th>
                  <th className="px-4 py-3.5 text-right">Refund Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map(order => {
                  const isPrepaid = order.paymentMethod === 'razorpay' || order.paymentMethod === 'online';
                  const isRefunded = order.paymentStatus === 'refunded';
                  const cleanPhone = (order.customer?.phone || '').replace(/\D/g, '');
                  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const waMessage = encodeURIComponent(
                    `Hello ${order.customer?.name || 'Customer'}, regarding your ShopIndia order #${order.orderNumber}: The store was unable to fulfill your items (${order.refundReason || 'Out of stock'}). ${isPrepaid ? (isRefunded ? 'Your refund has already been initiated via Razorpay.' : 'We are processing your refund immediately back to your original payment method.') : 'No payment was deducted since it was Cash on Delivery.'} If you need assistance, please reply to this message.`
                  );

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Order Info */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-extrabold text-gray-900 font-mono text-[11px]">
                          {order.orderNumber}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              order.type === 'quick_commerce'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {order.type === 'quick_commerce' ? '⚡ Quick (10-Min)' : '🇮🇳 Shop India'}
                          </span>
                        </div>
                        {order.items && order.items.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-1 max-w-[180px] truncate" title={order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-gray-900">{order.customer?.name || 'Valued Buyer'}</div>
                        {order.customer?.phone ? (
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`tel:${order.customer.phone}`}
                              className="text-[11px] font-mono font-semibold text-blue-600 hover:underline flex items-center gap-1"
                              title="Call customer directly"
                            >
                              <Phone className="w-3 h-3 text-blue-500" />
                              <span>{order.customer.phone}</span>
                            </a>
                            {cleanPhone.length >= 10 && (
                              <a
                                href={`https://wa.me/${waPhone}?text=${waMessage}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                title="Open WhatsApp chat with prefilled order cancellation explanation"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">Phone not provided</span>
                        )}
                      </td>

                      {/* Area */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-start gap-1 text-[11px] text-gray-700 max-w-[160px]">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <div>{order.deliveryLine1 || 'Doorstep Address'}</div>
                            <div className="text-[10px] text-gray-500 font-semibold font-mono">
                              {[order.deliveryCity, order.deliveryPincode].filter(Boolean).join(' - ')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Vendor Info */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-gray-900 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span>{order.vendor?.businessName || 'Assigned Store'}</span>
                        </div>
                        {order.vendor?.phone && (
                          <a href={`tel:${order.vendor.phone}`} className="text-[10px] text-gray-500 font-mono hover:underline">
                            {order.vendor.phone}
                          </a>
                        )}
                        <div className="text-[10px] text-gray-400">{order.vendor?.city || ''}</div>
                      </td>

                      {/* Rejection Reason */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="p-2 rounded-xl bg-red-50/80 border border-red-100 text-red-900 text-[11px] leading-relaxed max-w-[200px]">
                          <div className="font-extrabold text-[10px] uppercase text-red-700 tracking-wider mb-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Store Cancellation Note</span>
                          </div>
                          <span>"{order.refundReason || 'Item damaged or temporarily out of stock in physical store.'}"</span>
                        </div>
                      </td>

                      {/* Payment Amount & Method */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-extrabold text-gray-900 text-sm">
                          ₹{(order.total || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="mt-0.5">
                          {isPrepaid ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 inline-flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5" />
                              <span>Razorpay Paid</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Banknote className="w-2.5 h-2.5" />
                              <span>COD (Cash)</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          {isRefunded ? (
                            <span className="text-[9.5px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Refund Initiated</span>
                            </span>
                          ) : isPrepaid ? (
                            <span className="text-[9.5px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 animate-pulse">
                              Refund Pending
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-semibold text-gray-400">
                              Zero Due (COD)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 align-top text-right">
                        {isPrepaid && !isRefunded ? (
                          <button
                            onClick={() => handleOpenRefundModal(order)}
                            disabled={processingId === order.id}
                            className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ml-auto active:scale-95"
                          >
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            <span>⚡ Process Razorpay Refund</span>
                          </button>
                        ) : isRefunded ? (
                          <div className="text-right space-y-0.5">
                            <span className="text-[11px] font-black text-emerald-700 flex items-center justify-end gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Refund Initiated via Razorpay</span>
                            </span>
                            {order.refundReason && (
                              <div className="text-[10px] text-gray-600 font-mono font-medium max-w-[200px] ml-auto truncate" title={order.refundReason}>
                                {order.refundReason}
                              </div>
                            )}
                            <div className="text-[9px] text-emerald-600 font-semibold">
                              Transferred to user bank (1–5 days)
                            </div>
                            {order.refundedAt && (
                              <div className="text-[9.5px] text-gray-400 font-mono">
                                {new Date(order.refundedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold italic">
                            COD — No Refund Required
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1-Click Razorpay Refund Modal */}
      {refundOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Initiate Instant Razorpay Refund</h3>
                  <p className="text-xs text-gray-500">Order #{refundOrder.orderNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setRefundOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 leading-relaxed">
              💡 <strong>Direct Gateway Settlement:</strong> This calls the Razorpay Refund API directly from our server. The funds will be credited to the customer's original payment method (Card/UPI/Netbanking) in 3–5 working days. No vendor wallet balance will be debited.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Customer</label>
                <div className="text-xs text-gray-900 font-semibold bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                  <span>{refundOrder.customer?.name || 'Customer'}</span>
                  <span className="font-mono text-gray-500">{refundOrder.customer?.phone || ''}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-extrabold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason Recorded in Ledger & SMS</label>
                <textarea
                  rows={2}
                  value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  placeholder="Reason for refund..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRefundOrder(null)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === refundOrder.id || refundAmount <= 0}
                onClick={handleExecuteRefund}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {processingId === refundOrder.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-white" />
                )}
                <span>Confirm & Send Refund</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
