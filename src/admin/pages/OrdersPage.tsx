import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, RefreshCw, Eye, Download } from 'lucide-react';
import { OrderDetailsModal } from '../components/OrderDetailsModal';
import { generateAndPrintInvoice } from '../../utils/invoiceGenerator';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [refundModal, setRefundModal] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ orders: any[] }>('/api/admin/orders')
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => (o.id === orderId || o._id === orderId) ? { ...o, status: newStatus } : o));
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder._id === orderId)) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const processRefund = async () => {
    if (!refundModal) return;
    try {
      await api.post(`/api/admin/orders/${refundModal._id || refundModal.id}/refund`, { refundAmount, refundReason });
      load();
      setRefundModal(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = orders.filter(o => {
    const matchesQuery = !q ||
      o.orderNumber?.toLowerCase().includes(q.toLowerCase()) ||
      o.id?.toLowerCase().includes(q.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(q.toLowerCase()) ||
      o.customerId?.name?.toLowerCase().includes(q.toLowerCase()) ||
      o.vendor?.businessName?.toLowerCase().includes(q.toLowerCase()) ||
      o.items?.some((item: any) => item.name?.toLowerCase().includes(q.toLowerCase()) || item.product?.vendor?.businessName?.toLowerCase().includes(q.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-heading">Order Management &amp; Monitoring</h1>
          <p className="text-xs text-gray-500">Track live orders, update statuses, view customer details, and process refunds</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'placed', label: 'Placed' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'processing', label: 'Processing' },
            { id: 'shipped', label: 'Shipped' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#0F2C59] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search order #, customer, item..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-white"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-5 py-3.5 font-bold">Order ID</th>
              <th className="px-5 py-3.5 font-bold">Customer</th>
              <th className="px-5 py-3.5 font-bold">Vendor</th>
              <th className="px-5 py-3.5 font-bold">Type</th>
              <th className="px-5 py-3.5 font-bold">Total</th>
              <th className="px-5 py-3.5 font-bold">Status</th>
              <th className="px-5 py-3.5 font-bold">Date</th>
              <th className="px-5 py-3.5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-5 py-5"><div className="h-4 skeleton-shimmer rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-14 text-gray-400 font-medium">No orders found matching filters.</td></tr>
            ) : (
              filtered.map(o => {
                const customer = o.customer || o.customerId;
                const vendor = o.vendor || o.items?.[0]?.product?.vendor;
                const orderId = o.id || o._id;
                const itemsCount = o.items?.length || 1;
                const firstItemName = o.items?.[0]?.name || o.items?.[0]?.title;

                return (
                  <tr key={orderId} className="hover:bg-gray-50/50 transition-colors">
                    {/* Order ID Column */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-gray-900 text-xs tracking-tight">{o.orderNumber}</span>
                        {firstItemName && (
                          <span className="text-[11px] text-gray-400 truncate max-w-[200px]" title={firstItemName}>
                            {firstItemName} {itemsCount > 1 ? `+${itemsCount - 1} more` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{customer?.name || 'Customer'}</p>
                      <p className="text-[11px] text-gray-400">{customer?.email}</p>
                      {customer?.phone && <p className="text-[10px] text-gray-400 font-mono">{customer?.phone}</p>}
                    </td>

                    {/* Vendor */}
                    <td className="px-5 py-4">
                      {vendor?.businessName ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-xs">{vendor.businessName}</span>
                          {vendor.phone && (
                            <span className="text-[11px] text-gray-500 font-mono">{vendor.phone}</span>
                          )}
                          {vendor.email && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[140px]">{vendor.email}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px] px-2 py-0.5 rounded bg-gray-50 border border-gray-100">
                          ShopIndia Direct
                        </span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span className="capitalize text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {o.type?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4 font-numbers font-bold text-gray-900 text-xs">
                      ₹{o.total?.toLocaleString('en-IN')}
                    </td>

                    {/* Status with Inline Dropdown */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <select
                          disabled={updatingId === orderId}
                          value={o.status}
                          onChange={(e) => handleStatusChange(orderId, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border focus:outline-none cursor-pointer transition-all ${
                            o.status === 'delivered' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            o.status === 'cancelled' || o.status === 'refunded' ? 'bg-red-50 border-red-200 text-red-700' :
                            'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          <option value="placed">Placed</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-gray-400 text-[11px]">{o.createdAt?.slice(0, 10)}</td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="View Details"
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>

                        <button
                          onClick={() => generateAndPrintInvoice(o)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                          title="Print Invoice"
                        >
                          <Download size={13} />
                        </button>

                        {o.status !== 'refunded' && o.status !== 'cancelled' && (
                          <button
                            onClick={() => { setRefundModal(o); setRefundAmount(o.total); }}
                            className="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title="Refund"
                          >
                            <RefreshCw size={11} /> Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusChange={(newStatus) => {
          if (selectedOrder) {
            handleStatusChange(selectedOrder.id || selectedOrder._id, newStatus);
          }
        }}
      />

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Process Refund</h3>
            <p className="text-xs text-gray-500">Order: <span className="font-mono font-bold text-gray-800">{refundModal.orderNumber}</span></p>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Refund Amount (₹)</label>
              <input
                type="number"
                value={refundAmount}
                onChange={e => setRefundAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl text-xs font-numbers font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Reason</label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Reason for refund..."
                className="w-full px-3 py-2 border rounded-xl text-xs resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setRefundModal(null)} className="flex-1 py-2.5 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={processRefund} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-md">Confirm Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
