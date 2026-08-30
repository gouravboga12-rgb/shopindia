import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader, Badge, statusTone, EmptyState, PrimaryButton, GhostButton } from '../../components/dashboard/DashboardUI';
import { Package, X, Download, RotateCcw, Undo2, ArrowLeftRight, CheckCircle2, ChevronRight, Zap, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '../../lib/customerApi';
import type { OrderItem, VerticalType } from '../../context/AppContext';

const QUICK_STEPS: Record<string, string[]> = {
  pending: ['Order Placed', 'Awaiting Store Acceptance'],
  placed: ['Order Placed', 'Packing at Dark Store'],
  confirmed: ['Order Placed', 'Packing at Dark Store'],
  packing: ['Order Placed', 'Packing at Dark Store', 'Packed & Ready'],
  processing: ['Order Placed', 'Packing at Dark Store', 'Packed & Ready'],
  shipped: ['Order Placed', 'Packed & Ready', 'Rider On The Way ⚡'],
  on_the_way: ['Order Placed', 'Packed & Ready', 'Rider On The Way ⚡'],
  delivered: ['Order Placed', 'Packed & Ready', 'Rider On The Way ⚡', 'Delivered to Doorstep 🎉'],
};

const SERVICE_STEPS: Record<string, string[]> = {
  pending: ['Booking Requested', 'Confirming Slot'],
  placed: ['Service Booked', 'Technician Being Assigned'],
  confirmed: ['Service Booked', 'Certified Technician Assigned 👨‍🔧'],
  processing: ['Service Booked', 'Technician Assigned', 'Preparing Equipment'],
  shipped: ['Service Booked', 'Technician Assigned', 'Technician On The Way 🛠️'],
  on_the_way: ['Service Booked', 'Technician Assigned', 'Technician On The Way 🛠️'],
  delivered: ['Service Booked', 'Technician Arrived', 'Job Completed (30-Day Warranty Active) ✅'],
  completed: ['Service Booked', 'Technician Arrived', 'Job Completed (30-Day Warranty Active) ✅'],
};

const ECOMMERCE_STEPS: Record<string, string[]> = {
  pending: ['Order Placed', 'Awaiting Confirmation'],
  placed: ['Order Placed', 'Order Confirmed by Seller'],
  confirmed: ['Order Placed', 'Order Confirmed by Seller'],
  processing: ['Order Placed', 'Order Confirmed', 'Processing Order'],
  packing: ['Order Placed', 'Order Confirmed', 'Packed & Boxed'],
  ready_to_ship: ['Order Placed', 'Order Confirmed', 'Packed & Boxed', 'Courier Manifested'],
  shipped: ['Order Placed', 'Order Confirmed', 'Packed', 'Shipped via Express Courier 🚚'],
  in_transit: ['Order Placed', 'Order Confirmed', 'Packed', 'Shipped', 'In Transit to Hub'],
  out_for_delivery: ['Order Placed', 'Order Confirmed', 'Packed', 'Shipped', 'Out For Delivery Today 📦'],
  delivered: ['Order Placed', 'Order Confirmed', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered at Doorstep 🎁'],
};

export const OrdersPage: React.FC = () => {
  const { orders, cancelOrder, updateOrderStatus } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterVertical, setFilterVertical] = useState<'all' | VerticalType>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  const getOrderVertical = (o: any): VerticalType => {
    if (o.vertical === 'quick' || o.vertical === 'services' || o.vertical === 'shop') return o.vertical;
    if (o.type === 'quick_commerce') return 'quick';
    if (o.type === 'hvac_service' || o.type === 'hvac') return 'services';
    if (o.type === 'traditional') return 'shop';
    const prodVertical = o.items?.[0]?.product?.category?.vertical || o.items?.[0]?.product?.vertical;
    if (prodVertical === 'quick' || prodVertical === 'services' || prodVertical === 'shop') return prodVertical;
    return 'shop';
  };

  const filteredOrders = filterVertical === 'all'
    ? orders
    : orders.filter(o => getOrderVertical(o) === filterVertical);

  const countQuick = orders.filter(o => getOrderVertical(o) === 'quick').length;
  const countServices = orders.filter(o => getOrderVertical(o) === 'services').length;
  const countShop = orders.filter(o => getOrderVertical(o) === 'shop').length;

  const openOrder = openId !== null ? orders.find((o) => (o.id || '') === openId) : null;
  const orderVert = openOrder ? getOrderVertical(openOrder) : 'shop';
  const steps = openOrder ? getVerticalSteps(openOrder.status, orderVert) : [];
  const cancelable = openOrder ? ['pending', 'placed', 'confirmed', 'processing', 'packing'].includes(openOrder.status) : false;

  return (
    <div className="space-y-6 text-left">
      <PageHeader 
        title="My Orders & Bookings" 
        subtitle={`${orders.length} total order${orders.length === 1 ? '' : 's'} across all modules`} 
      />

      {/* Vertical Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all', label: `All Orders (${orders.length})` },
          { id: 'quick', label: `⚡ 10 Min Delivery (${countQuick})` },
          { id: 'services', label: `🛠️ Services & Bookings (${countServices})` },
          { id: 'shop', label: `🛍️ Traditional Shopping (${countShop})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterVertical(tab.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              filterVertical === tab.id
                ? 'bg-brand-graphite text-white border-brand-graphite shadow-sm'
                : 'bg-white text-brand-slate border-brand-border hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <EmptyState 
          icon={<Package className="w-6 h-6" />} 
          title={filterVertical === 'services' ? 'No Service Bookings' : filterVertical === 'quick' ? 'No 10-Min Orders' : 'No Orders Yet'} 
          message="Once you place an order or book a service, live real-time tracking will appear here." 
        />
      )}

      <div className="flex flex-col gap-4">
        {filteredOrders.map((o) => {
          const isOpen = openId === o.id;
          const v = getOrderVertical(o);
          const firstImage = o.items?.[0]?.product?.image;

          const vertBadge = v === 'quick' ? {
            label: '⚡ 10 Min Delivery',
            bg: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          } : v === 'services' ? {
            label: '🛠️ Service Booking',
            bg: 'bg-amber-50 text-amber-700 border-amber-200'
          } : {
            label: '🛍️ Courier E-Commerce',
            bg: 'bg-blue-50 text-blue-700 border-blue-200'
          };

          return (
            <motion.div key={o.id} layout className="bg-white border border-brand-border rounded-card shadow-premium overflow-hidden">
              <button onClick={() => setOpenId(isOpen ? null : o.id)} className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-brand-border/80 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {firstImage ? (
                      <img src={firstImage} alt="Product" className="w-full h-full object-cover" />
                    ) : v === 'quick' ? (
                      <Zap className="w-5 h-5 text-amber-500" />
                    ) : v === 'services' ? (
                      <Wrench className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Package className="w-5 h-5 text-brand-blue" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${vertBadge.bg}`}>
                        {vertBadge.label}
                      </span>
                      <Badge tone={statusTone(o.status)}>
                        {v === 'services' && ((o.status as string) === 'placed' || (o.status as string) === 'pending') ? 'Service Booked' : o.status === 'placed' ? 'Order Placed' : o.status}
                      </Badge>
                    </div>

                    <span className="font-bold text-sm text-brand-graphite block truncate">
                      {o.items.map(it => it.product?.title || 'Item').join(', ') || 'Order Details'}
                    </span>
                    <p className="text-xs text-brand-slate mt-0.5">
                      {v === 'services' ? 'Booking' : 'Order'} {o.orderNumber || o.id} • {o.date || 'Today'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-brand-graphite font-numbers text-sm">₹{o.total.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-brand-slate">{o.items.length} item{o.items.length > 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-brand-slate transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && openOrder && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="border-t border-brand-border/60 bg-slate-50/40 overflow-hidden">
                    <div className="p-5 space-y-5">
                      {/* Tracking timeline */}
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate mb-3">Order Tracking</h4>
                        <div className="flex flex-col">
                          {steps.map((s, i) => (
                            <div key={s} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i < steps.length ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                {i < steps.length - 1 && <div className="w-0.5 h-8 bg-emerald-400" />}
                              </div>
                              <p className={`text-xs font-semibold pt-1 ${i < steps.length ? 'text-brand-graphite' : 'text-brand-slate'}`}>{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Items */}
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate mb-3">Items</h4>
                          <div className="flex flex-col gap-3">
                            {openOrder.items.map((it: OrderItem, i: number) => (
                              <div key={i} className="flex items-center gap-3 bg-white border border-brand-border rounded-xl p-2.5">
                                <img src={it.product.image} alt={it.product.title} className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-brand-graphite line-clamp-1">{it.product.title}</p>
                                  <p className="text-xs text-brand-slate">Qty {it.quantity}</p>
                                </div>
                                <span className="text-xs font-bold text-brand-graphite font-numbers">₹{(it.product.price * it.quantity).toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Summary + actions */}
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate mb-3">Order Summary</h4>
                          <div className="bg-white border border-brand-border rounded-lg p-4 space-y-2 text-xs text-brand-slate">
                            <div className="flex justify-between"><span>Subtotal</span><span className="font-bold text-brand-graphite font-numbers">₹{openOrder.total.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between"><span>Shipping</span><span className="font-bold text-emerald-600">FREE</span></div>
                            <div className="flex justify-between"><span>Tax (incl.)</span><span className="font-bold text-brand-graphite font-numbers">₹{Math.round(openOrder.total * 0.12).toLocaleString('en-IN')}</span></div>
                            <div className="border-t border-brand-border pt-2 flex justify-between items-center">
                              <span className="font-bold text-brand-graphite">Grand Total</span>
                              <span className="font-extrabold text-brand-blue font-numbers">₹{openOrder.total.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <PrimaryButton onClick={() => alert('Invoice downloaded (demo).')} className="inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Invoice</PrimaryButton>
                            {cancelable && (
                              <button 
                                disabled={isProcessing}
                                onClick={async () => { 
                                  if (confirm('Are you sure you want to cancel this order?')) {
                                    setIsProcessing(true);
                                    try {
                                      await cancelOrder(openOrder.id);
                                      trackEvent('ORDER_CANCELLED', { entityId: openOrder.id, entityType: 'order' }); 
                                      alert('Order successfully cancelled.');
                                    } catch (err) {
                                      alert('Failed to cancel order.');
                                    } finally {
                                      setIsProcessing(false);
                                    }
                                  }
                                }} 
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-button text-xs font-bold disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" /> Cancel
                              </button>
                            )}
                            {openOrder.status === 'delivered' && (
                              <>
                                <GhostButton 
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1.5 disabled:opacity-50" 
                                  onClick={async () => { 
                                    setIsProcessing(true);
                                    try {
                                      await updateOrderStatus(openOrder.id, 'returned');
                                      trackEvent('RETURN_REQUESTED', { entityId: openOrder.id, entityType: 'order' }); 
                                      alert('Return request submitted.');
                                    } catch (err) {
                                      alert('Failed to submit return request.');
                                    } finally {
                                      setIsProcessing(false);
                                    }
                                  }}
                                >
                                  <Undo2 className="w-3.5 h-3.5" /> Return
                                </GhostButton>
                                <GhostButton 
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1.5 disabled:opacity-50" 
                                  onClick={async () => { 
                                    setIsProcessing(true);
                                    try {
                                      await updateOrderStatus(openOrder.id, 'returned');
                                      trackEvent('EXCHANGE_REQUESTED', { entityId: openOrder.id, entityType: 'order' }); 
                                      alert('Exchange request submitted.'); 
                                    } catch (err) {
                                      alert('Failed to submit exchange request.');
                                    } finally {
                                      setIsProcessing(false);
                                    }
                                  }}
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" /> Exchange
                                </GhostButton>
                              </>
                            )}
                            <GhostButton className="inline-flex items-center gap-1.5" onClick={() => { trackEvent('REORDER', { entityId: openOrder.id, entityType: 'order' }); alert('Items added to cart (demo).'); }}>
                              <RotateCcw className="w-3.5 h-3.5" /> Reorder
                            </GhostButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

function getVerticalSteps(status: string, vertical: VerticalType): string[] {
  if (vertical === 'quick') {
    return QUICK_STEPS[status] || ['Order Placed', 'Packing at Store', 'Rider Dispatched', 'Delivered'];
  }
  if (vertical === 'services') {
    return SERVICE_STEPS[status] || ['Service Booked', 'Technician Assigned', 'Technician On The Way', 'Job Completed'];
  }
  return ECOMMERCE_STEPS[status] || ['Order Placed', 'Order Confirmed', 'Packed', 'Shipped', 'Delivered'];
}