import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, RefreshCw, Phone, MessageSquare, Mail, ExternalLink, Trash2, FileText, AlertTriangle, X, Loader2, CheckCircle2, Copy, Check } from 'lucide-react';
import { generateAndPrintInvoice } from '../../utils/invoiceGenerator';

export const VendorOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sticky Delete Confirmation Modal State
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ orders: any[] }>('/api/vendor/orders')
      .then(d => setOrders(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Auto-dismiss success toast
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoadingId(id);
    try {
      await api.patch(`/api/vendor/orders/${id}/status`, { status });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      setSuccessToast(`Order #${orders.find(o => o.id === id)?.orderNumber || id} updated to ${status}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/vendor/orders/${orderToDelete.id}`);
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      setSuccessToast(`Order #${orderToDelete.orderNumber} deleted permanently across the platform.`);
      setOrderToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete order. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyOrderNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = orders.filter(o => {
    const matchesQ = !q ||
      o.orderNumber?.toLowerCase().includes(q.toLowerCase()) ||
      o.id?.toLowerCase().includes(q.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(q.toLowerCase()) ||
      o.customer?.phone?.toLowerCase().includes(q.toLowerCase()) ||
      o.customer?.email?.toLowerCase().includes(q.toLowerCase()) ||
      o.items?.some((item: any) => item.name?.toLowerCase().includes(q.toLowerCase()) || item.product?.name?.toLowerCase().includes(q.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-300 border border-emerald-500">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Vendor Order Fulfillment</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage customer orders, contact buyers via Phone or WhatsApp, review invoices, and handle pipeline updates</p>
        </div>
        <button
          onClick={load}
          className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'placed', label: 'Placed' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'packing', label: 'Packing' },
            { id: 'ready_to_ship', label: 'Ready to Ship' },
            { id: 'shipped', label: 'Shipped' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#10B981] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search order #, customer, phone, or product..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 bg-white"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[1050px]">
          <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3.5 font-bold">Order ID</th>
              <th className="px-4 py-3.5 font-bold">Customer Details</th>
              <th className="px-4 py-3.5 font-bold">Product Details &amp; Link</th>
              <th className="px-4 py-3.5 font-bold">Total Amount</th>
              <th className="px-4 py-3.5 font-bold">Status</th>
              <th className="px-4 py-3.5 font-bold">Fulfillment Actions</th>
              <th className="px-4 py-3.5 font-bold text-center text-red-600">Delete Option</th>
              <th className="px-4 py-3.5 font-bold text-center">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-6"><div className="h-4 skeleton-shimmer rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-14 text-gray-400 font-medium">No matching orders found.</td></tr>
            ) : (
              filtered.map(o => {
                const customer = o.customer || {};
                const customerName = customer.name || 'Customer';
                const customerPhone = customer.phone || o.deliveryPhone || '';
                const cleanPhone = customerPhone.replace(/\D/g, '');
                // Format phone for WhatsApp: if 10 digits in India, prefix 91
                const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                const waMessage = encodeURIComponent(`Hello ${customerName}, this is regarding your ShopIndia order #${o.orderNumber}.`);

                return (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Order ID */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-gray-900 text-xs tracking-tight">{o.orderNumber}</span>
                          <button
                            onClick={() => copyOrderNumber(o.orderNumber)}
                            className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer"
                            title="Copy Order ID"
                          >
                            {copiedId === o.orderNumber ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                        </span>
                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded w-fit capitalize">
                          {o.type?.replace('_', ' ') || 'Traditional'}
                        </span>
                      </div>
                    </td>

                    {/* Customer Details with Call & WhatsApp buttons */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        <p className="font-bold text-gray-900 text-xs">{customerName}</p>
                        
                        {customerPhone ? (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="font-mono text-[11px] text-gray-600 font-semibold">{customerPhone}</span>
                            <div className="flex items-center gap-1 mt-1">
                              {/* Call Action */}
                              <a
                                href={`tel:${customerPhone}`}
                                title={`Call ${customerName}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[10px] font-bold transition-all"
                              >
                                <Phone size={10} />
                                <span>Call</span>
                              </a>
                              {/* WhatsApp Action */}
                              <a
                                href={`https://wa.me/${waPhone}?text=${waMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold transition-all"
                              >
                                <MessageSquare size={10} className="fill-emerald-600/30" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No phone on file</span>
                        )}

                        {customer.email && (
                          <a
                            href={`mailto:${customer.email}?subject=Regarding Order ${o.orderNumber}`}
                            className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-1 truncate mt-0.5"
                            title={customer.email}
                          >
                            <Mail size={10} className="shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Product Details & Storefront Redirect Link */}
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2.5 max-w-[280px]">
                        {o.items && o.items.length > 0 ? (
                          o.items.map((item: any, idx: number) => {
                            const prod = item.product || {};
                            const prodId = item.productId || prod.id;
                            const prodImg = prod.images?.[0]?.url || item.image || '';
                            const prodTitle = item.name || prod.name || 'Product Item';

                            return (
                              <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-100/60 transition-colors">
                                {prodImg ? (
                                  <img
                                    src={prodImg}
                                    alt={prodTitle}
                                    className="w-10 h-10 object-contain rounded-lg bg-white border border-gray-200 p-0.5 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 shrink-0 font-bold text-[10px]">
                                    ITEM
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 text-xs truncate" title={prodTitle}>
                                    {prodTitle}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-500 font-numbers mt-0.5">
                                    <span>Qty: <strong className="text-gray-800 font-bold">{item.quantity}</strong></span>
                                    <span>•</span>
                                    <span>₹{item.price} each</span>
                                  </div>

                                  {/* Storefront Redirect Link */}
                                  {prodId && (
                                    <a
                                      href={`/?productId=${prodId}#/detail`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline mt-1 cursor-pointer"
                                      title="Open product on storefront to see exact details"
                                    >
                                      <span>View Product</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">No items listed</span>
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-4 align-top font-numbers font-black text-gray-900 text-xs">
                      ₹{o.total?.toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 align-top">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        o.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        o.status === 'cancelled' || o.status === 'refunded' ? 'bg-red-50 text-red-700 border border-red-200' :
                        o.status === 'ready_to_ship' || o.status === 'shipped' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        o.status === 'packing' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {o.status?.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Fulfillment Actions */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        {o.status === 'placed' && (
                          <button
                            disabled={actionLoadingId === o.id}
                            onClick={() => updateStatus(o.id, 'confirmed')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                          >
                            Confirm Order
                          </button>
                        )}
                        {o.status === 'confirmed' && (
                          <button
                            disabled={actionLoadingId === o.id}
                            onClick={() => updateStatus(o.id, 'packing')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                          >
                            Start Packing
                          </button>
                        )}
                        {o.status === 'packing' && (
                          <button
                            disabled={actionLoadingId === o.id}
                            onClick={() => updateStatus(o.id, 'ready_to_ship')}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                          >
                            Mark Ready to Ship
                          </button>
                        )}
                        {o.status === 'ready_to_ship' && (
                          <button
                            disabled={actionLoadingId === o.id}
                            onClick={() => updateStatus(o.id, 'shipped')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                          >
                            Dispatch / Ship
                          </button>
                        )}
                        {o.status === 'shipped' && (
                          <button
                            disabled={actionLoadingId === o.id}
                            onClick={() => updateStatus(o.id, 'delivered')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {o.status === 'delivered' && (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Delete Option (with sticky confirmation) */}
                    <td className="px-4 py-4 align-top text-center">
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setOrderToDelete(o);
                        }}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200 inline-flex items-center justify-center gap-1 text-xs font-bold"
                        title="Delete Order Permanently"
                      >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </td>

                    {/* Invoice */}
                    <td className="px-4 py-4 align-top text-center">
                      <button
                        onClick={() => generateAndPrintInvoice(o)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-[#0F2C59] text-gray-700 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mx-auto whitespace-nowrap"
                        title="Download or Print GST Tax Invoice"
                      >
                        <FileText size={13} />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* STICKY DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          // Crucial: Backdrop click does NOTHING so the confirmation message STICKS to screen until user explicitly cancels or confirms!
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-red-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Warning Header Banner */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-5 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black font-heading">Delete Order Permanently?</h3>
                <p className="text-xs text-white/80">Action required — this dialog stays until you confirm or cancel</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to permanently delete order <strong className="text-gray-900 font-bold font-mono">#{orderToDelete.orderNumber}</strong>?
              </p>

              {/* Scope Notice */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertTriangle size={13} className="text-amber-600" />
                  Permanent Platform Deletion Impact:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                  <li>Deleted from <strong>Customer Account</strong> orders list</li>
                  <li>Removed from <strong>Vendor Wallet &amp; Payouts</strong> ledger</li>
                  <li>Excluded from <strong>Sales Analytics &amp; Revenue</strong> metrics</li>
                  <li>Removed from <strong>Admin Platform Monitoring</strong></li>
                </ul>
              </div>

              {/* Order Summary Snapshot */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID:</span>
                  <span className="font-mono font-bold text-gray-900">#{orderToDelete.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-bold text-gray-900">{orderToDelete.customer?.name || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Items:</span>
                  <span className="font-medium text-gray-800">{orderToDelete.items?.length || 1} product(s)</span>
                </div>
                <div className="flex justify-between border-t border-gray-200/60 pt-2 font-bold">
                  <span className="text-gray-700">Total Value:</span>
                  <span className="font-numbers text-gray-900">₹{orderToDelete.total?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Actions: Cancel vs OK (Delete) */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setOrderToDelete(null)}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel (Keep Order)
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteConfirm}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting…</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>OK, Delete Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
