import { X, MapPin, Mail, Phone, Package, Printer } from 'lucide-react';
import { generateAndPrintInvoice } from '../../utils/invoiceGenerator';

interface OrderDetailsModalProps {
  order: any | null;
  onClose: () => void;
  onStatusChange?: (status: string) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onStatusChange,
}) => {
  if (!order) return null;

  const customer = order.customer || order.customerId;
  const vendor = order.vendor || order.items?.[0]?.product?.vendor;
  const address = order.deliveryAddress;
  const addressStr = typeof address === 'string'
    ? address
    : address
    ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} ${address.postalCode ? '- ' + address.postalCode : ''}`
    : 'No delivery address specified';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 font-mono">{order.orderNumber}</h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                order.status === 'delivered' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                order.status === 'cancelled' || order.status === 'refunded' ? 'bg-red-50 border-red-200 text-red-700' :
                'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Placed on {order.createdAt?.slice(0, 10)} • Vertical: <span className="font-semibold text-gray-700 capitalize">{order.type?.replace('_', ' ')}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Customer, Vendor & Address Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Details</span>
              <p className="font-bold text-gray-900">{customer?.name || 'Customer'}</p>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail size={13} className="text-gray-400" />
                <span className="truncate">{customer?.email || 'N/A'}</span>
              </div>
              {customer?.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone size={13} className="text-gray-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor Details</span>
              <p className="font-bold text-gray-900">{vendor?.businessName || 'ShopIndia In-House'}</p>
              {vendor?.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone size={13} className="text-gray-400" />
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor?.email && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Mail size={13} className="text-gray-400" />
                  <span className="truncate">{vendor.email}</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Delivery Address</span>
              <div className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
                <span>{addressStr}</span>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order Items</h4>
            <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-xs">{item.name || item.title || 'Product'}</p>
                        <p className="text-[11px] text-gray-400 font-medium">Qty: {item.quantity || 1}</p>
                      </div>
                    </div>
                    <span className="font-numbers font-bold text-gray-900 text-xs">
                      ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 text-xs">No items listed.</div>
              )}
            </div>
          </div>

          {/* Status Update Quick Bar */}
          {onStatusChange && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-900 block">Update Order Status</span>
                <span className="text-[11px] text-blue-700">Advances customer tracking and logs status history</span>
              </div>
              <select
                value={order.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="bg-white border border-blue-200 text-blue-900 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="placed">Placed</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing / Packing</option>
                <option value="shipped">Shipped / Dispatched</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-numbers font-medium text-gray-900">₹{order.total}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping / Delivery Fee</span>
              <span className="text-emerald-600 font-bold">FREE</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-sm text-gray-900">
              <span>Grand Total</span>
              <span className="font-numbers text-[#0F2C59] text-base">₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => generateAndPrintInvoice(order)}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 flex items-center gap-2 shadow-sm transition-all"
          >
            <Printer size={15} />
            <span>Print Tax Invoice</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1E3A8A] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
