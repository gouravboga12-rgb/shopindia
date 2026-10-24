import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader, Badge, statusTone, EmptyState, PrimaryButton, GhostButton } from '../../components/dashboard/DashboardUI';
import { Package, X, Download, RotateCcw, Undo2, ArrowLeftRight, CheckCircle2, ChevronRight, Zap, Wrench, KeyRound, CreditCard, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '../../lib/customerApi';
import { api } from '../../lib/api';
import type { OrderItem, VerticalType } from '../../context/AppContext';
import { generateAndPrintInvoice } from '../../utils/invoiceGenerator';
import { LiveOrderTrackingModal } from '../../components/common/LiveOrderTrackingModal';
import { InlineOrderTracking } from '../../components/common/InlineOrderTracking';

interface Milestone {
  label: string;
}

const QUICK_MILESTONES: Milestone[] = [
  { label: 'Order Placed' },
  { label: 'Packing at Store' },
  { label: 'Rider Dispatched ⚡' },
  { label: 'Delivered 🎉' },
];

const SERVICE_MILESTONES: Milestone[] = [
  { label: 'Booking Confirmed' },
  { label: 'Technician Assigned 👨‍🔧' },
  { label: 'Technician On The Way 🛠️' },
  { label: 'Service Completed ✅' },
];

const ECOMMERCE_MILESTONES: Milestone[] = [
  { label: 'Order Placed' },
  { label: 'Order Confirmed' },
  { label: 'Packed & Boxed' },
  { label: 'Shipped via Courier 🚚' },
  { label: 'Out For Delivery' },
  { label: 'Delivered at Doorstep 🎁' },
];

function getMilestoneProgress(status: string, vertical: VerticalType): { milestones: Milestone[]; currentIndex: number } {
  const normStatus = (status || '').toLowerCase().trim();

  if (vertical === 'quick') {
    let currentIndex = 0;
    if (['placed', 'pending'].includes(normStatus)) {
      currentIndex = 0;
    } else if (['confirmed', 'packing', 'processing'].includes(normStatus)) {
      currentIndex = 1;
    } else if (['shipped', 'on_the_way', 'in_transit', 'out_for_delivery', 'assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'].includes(normStatus)) {
      currentIndex = 2; // Rider Dispatched - Step 3 Delivered is NOT checked!
    } else if (['delivered', 'completed'].includes(normStatus)) {
      currentIndex = 3; // Delivered
    }
    return { milestones: QUICK_MILESTONES, currentIndex };
  }

  if (vertical === 'services') {
    let currentIndex = 0;
    if (['placed', 'pending'].includes(normStatus)) {
      currentIndex = 0;
    } else if (['confirmed', 'assigned'].includes(normStatus)) {
      currentIndex = 1;
    } else if (['processing', 'packing', 'shipped', 'on_the_way', 'in_transit', 'arrived_pickup', 'picked_up'].includes(normStatus)) {
      currentIndex = 2;
    } else if (['delivered', 'completed'].includes(normStatus)) {
      currentIndex = 3;
    }
    return { milestones: SERVICE_MILESTONES, currentIndex };
  }

  // Traditional ShopIndia E-commerce
  let currentIndex = 0;
  if (['placed', 'pending'].includes(normStatus)) {
    currentIndex = 0;
  } else if (['confirmed'].includes(normStatus)) {
    currentIndex = 1;
  } else if (['processing', 'packing', 'ready_to_ship'].includes(normStatus)) {
    currentIndex = 2;
  } else if (['shipped'].includes(normStatus)) {
    currentIndex = 3;
  } else if (['in_transit', 'out_for_delivery'].includes(normStatus)) {
    currentIndex = 4;
  } else if (['delivered', 'completed'].includes(normStatus)) {
    currentIndex = 5;
  }
  return { milestones: ECOMMERCE_MILESTONES, currentIndex };
}

export const OrdersPage: React.FC = () => {
  const { orders, cancelOrder, updateOrderStatus } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterVertical, setFilterVertical] = useState<'all' | VerticalType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [orderOtps, setOrderOtps] = useState<Record<string, string>>({});
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const handlePayPendingRazorpay = async (order: any) => {
    setPayingOrderId(order.id);
    try {
      const res = await api.post<{
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        orderNumber: string;
      }>('/api/payments/create-order', { orderId: order.id });

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Razorpay SDK is loading. Please try again.');
        setPayingOrderId(null);
        return;
      }

      const options = {
        key: res.keyId || (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
        amount: res.amount,
        currency: res.currency || 'INR',
        name: 'ShopIndia',
        description: `Order #${res.orderNumber}`,
        image: '/favicon.png',
        order_id: res.razorpayOrderId,
        theme: { color: '#2563eb' },
        handler: async (response: any) => {
          try {
            await api.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId: order.id,
            });
            alert('Payment completed successfully via Razorpay!');
            window.location.reload();
          } catch (err) {
            console.warn('Verify notice:', err);
            window.location.reload();
          }
        },
        modal: {
          ondismiss: () => {
            setPayingOrderId(null);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Failed to initiate Razorpay payment.');
      setPayingOrderId(null);
    }
  };

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
  const milestoneInfo = openOrder ? getMilestoneProgress(openOrder.status, orderVert) : { milestones: [], currentIndex: 0 };
  const activeOtp = openOrder ? (orderOtps[openOrder.id] || (openOrder as any).deliveryOtp || (openOrder as any).delivery?.deliveryOtp || null) : null;
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
                    <div className="p-4 sm:p-6 space-y-6">
                      
                      {/* CONDITIONAL LAYOUT: Quick Commerce & Glacons Services vs Traditional ShopIndia */}
                      {orderVert === 'quick' || orderVert === 'services' ? (
                        <>
                          {/* TOP SECTION: Stepper on Left, Live Street Tracking Radar on Right (As requested!) */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                            {/* Left: Milestone Stepper with Accurate Progress */}
                            <div className="bg-white border border-brand-border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate">
                                    {orderVert === 'services' ? 'Service Timeline' : 'Delivery Progress'}
                                  </h4>
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${orderVert === 'services' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'}`}>
                                    {orderVert === 'services' ? 'Glacons Tech Booking' : '⚡ 10-Min Delivery'}
                                  </span>
                                </div>

                                <div className="flex flex-col">
                                  {milestoneInfo.milestones.map((m, i) => {
                                    const isCompleted = i <= milestoneInfo.currentIndex;
                                    const isCurrent = i === milestoneInfo.currentIndex;
                                    return (
                                      <div key={m.label} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                          <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                              isCompleted
                                                ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-100'
                                                : 'bg-slate-200 text-slate-400'
                                            }`}
                                          >
                                            {isCompleted ? (
                                              <CheckCircle2 className="w-4 h-4" />
                                            ) : (
                                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                                            )}
                                          </div>
                                          {i < milestoneInfo.milestones.length - 1 && (
                                            <div
                                              className={`w-0.5 h-8 transition-colors ${
                                                i < milestoneInfo.currentIndex ? 'bg-emerald-400' : 'bg-slate-200'
                                              }`}
                                            />
                                          )}
                                        </div>
                                        <div className="pt-0.5 pb-2">
                                          <p
                                            className={`text-xs font-semibold ${
                                              isCompleted ? 'text-brand-graphite' : 'text-slate-400'
                                            }`}
                                          >
                                            {m.label}
                                          </p>
                                          {isCurrent && i < milestoneInfo.milestones.length - 1 && (
                                            <span className="inline-block text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                              In Progress
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Right: Interactive Street Map (Swiggy / Zomato / Uber Style) */}
                            <div className="bg-white border border-brand-border rounded-2xl p-4 sm:p-5 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate">
                                    {orderVert === 'services' ? 'Live Technician Radar' : 'Live Partner Dispatch Radar'}
                                  </h4>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  GPS Live Telemetry
                                </span>
                              </div>
                              <InlineOrderTracking
                                orderId={openOrder.id}
                                orderNumber={openOrder.orderNumber}
                                orderStatus={openOrder.status}
                                vertical={orderVert}
                                initialOtp={activeOtp}
                                onOtpLoaded={(code) => setOrderOtps((prev) => ({ ...prev, [openOrder.id]: code }))}
                              />
                            </div>
                          </div>

                          {/* BOTTOM SECTION: Items + OTP on Left, Order Summary & Actions on Right */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                            {/* Left: Items list + PROMINENT CUSTOMER DELIVERY OTP */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate mb-3">Items</h4>
                                <div className="flex flex-col gap-3">
                                  {openOrder.items.map((it: OrderItem, i: number) => (
                                    <div key={i} className="flex items-center gap-3 bg-white border border-brand-border rounded-xl p-2.5 shadow-sm">
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

                              {/* PROMINENT 4-DIGIT CUSTOMER DELIVERY OTP (Directly under items / beside tracking) */}
                              {activeOtp ? (
                                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400 rounded-2xl shadow-sm flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-orange-500/20">
                                      <KeyRound className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                                          Customer Delivery OTP
                                        </span>
                                        <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                                          Required for Handover
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-600 mt-0.5">
                                        Share this 4-digit code with the {orderVert === 'services' ? 'technician' : 'delivery partner'} upon arrival
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right pl-3">
                                    <div className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-slate-900 bg-white px-3.5 py-1.5 rounded-xl border border-amber-300 shadow-sm inline-block">
                                      {activeOtp}
                                    </div>
                                  </div>
                                </div>
                              ) : openOrder.status === 'delivered' ? (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  Order handed over and verified via secure OTP.
                                </div>
                              ) : null}
                            </div>

                            {/* Right: Order Summary + Actions */}
                            <div>
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate mb-3">Order Summary</h4>
                              <div className="bg-white border border-brand-border rounded-lg p-4 space-y-2 text-xs text-brand-slate shadow-sm">
                                <div className="flex justify-between"><span>Subtotal</span><span className="font-bold text-brand-graphite font-numbers">₹{openOrder.total.toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between"><span>Shipping</span><span className="font-bold text-emerald-600">FREE</span></div>
                                <div className="flex justify-between"><span>GST (18% incl.)</span><span className="font-bold text-brand-graphite font-numbers">₹{Math.round(openOrder.total - (openOrder.total / 1.18)).toLocaleString('en-IN')}</span></div>
                                <div className="border-t border-brand-border pt-2 flex justify-between items-center">
                                  <span className="font-bold text-brand-graphite">Grand Total</span>
                                  <span className="font-extrabold text-brand-blue font-numbers">₹{openOrder.total.toLocaleString('en-IN')}</span>
                                </div>
                              </div>

                              {openOrder.vendor && (
                                <div className="mt-3 bg-white border border-brand-border rounded-lg p-3.5 text-xs text-brand-slate shadow-sm">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-slate mb-1">Sold & Shipped By</p>
                                  <p className="font-bold text-brand-graphite text-xs">{openOrder.vendor.businessName}</p>
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {[openOrder.vendor.street, openOrder.vendor.city, openOrder.vendor.state, openOrder.vendor.pincode].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                              )}

                              <div className="mt-4 flex flex-wrap gap-2">
                                <PrimaryButton onClick={() => generateAndPrintInvoice({ ...openOrder, vertical: orderVert })} className="inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Invoice</PrimaryButton>
                                {((openOrder as any).paymentStatus !== 'paid' && openOrder.status !== 'cancelled' && openOrder.status !== 'delivered') && (
                                  <button 
                                    disabled={payingOrderId === openOrder.id}
                                    onClick={() => handlePayPendingRazorpay(openOrder)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-button text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                                  >
                                    {payingOrderId === openOrder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                    <span>Pay ₹{openOrder.total.toLocaleString('en-IN')} via Razorpay</span>
                                  </button>
                                )}
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
                                <GhostButton className="inline-flex items-center gap-1.5" onClick={() => { trackEvent('REORDER', { entityId: openOrder.id, entityType: 'order' }); alert('Items added to cart (demo).'); }}>
                                  <RotateCcw className="w-3.5 h-3.5" /> Reorder
                                </GhostButton>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* TRADITIONAL SHOPINDIA (ECOMMERCE) LAYOUT - UNTOUCHED, RESERVED FOR SHIPROCKET */
                        <>
                          {/* Tracking timeline */}
                          <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate mb-3">Order Tracking</h4>
                            <div className="flex flex-col">
                              {milestoneInfo.milestones.map((m, i) => {
                                const isCompleted = i <= milestoneInfo.currentIndex;
                                return (
                                  <div key={m.label} className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="w-2 h-2 rounded-full bg-slate-400" />}
                                      </div>
                                      {i < milestoneInfo.milestones.length - 1 && <div className={`w-0.5 h-8 ${i < milestoneInfo.currentIndex ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                                    </div>
                                    <p className={`text-xs font-semibold pt-1 ${isCompleted ? 'text-brand-graphite' : 'text-brand-slate'}`}>{m.label}</p>
                                  </div>
                                );
                              })}
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
                                <div className="flex justify-between"><span>GST (18% incl.)</span><span className="font-bold text-brand-graphite font-numbers">₹{Math.round(openOrder.total - (openOrder.total / 1.18)).toLocaleString('en-IN')}</span></div>
                                <div className="border-t border-brand-border pt-2 flex justify-between items-center">
                                  <span className="font-bold text-brand-graphite">Grand Total</span>
                                  <span className="font-extrabold text-brand-blue font-numbers">₹{openOrder.total.toLocaleString('en-IN')}</span>
                                </div>
                              </div>

                              {openOrder.vendor && (
                                <div className="mt-3 bg-white border border-brand-border rounded-lg p-3.5 text-xs text-brand-slate">
                                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-slate mb-1">Sold & Shipped By</p>
                                  <p className="font-bold text-brand-graphite text-xs">{openOrder.vendor.businessName}</p>
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {[openOrder.vendor.street, openOrder.vendor.city, openOrder.vendor.state, openOrder.vendor.pincode].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                              )}

                              <div className="mt-4 flex flex-wrap gap-2">
                                <PrimaryButton onClick={() => generateAndPrintInvoice({ ...openOrder, vertical: orderVert })} className="inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Invoice</PrimaryButton>
                                {((openOrder as any).paymentStatus !== 'paid' && openOrder.status !== 'cancelled' && openOrder.status !== 'delivered') && (
                                  <button 
                                    disabled={payingOrderId === openOrder.id}
                                    onClick={() => handlePayPendingRazorpay(openOrder)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-button text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                                  >
                                    {payingOrderId === openOrder.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                    <span>Pay ₹{openOrder.total.toLocaleString('en-IN')} via Razorpay</span>
                                  </button>
                                )}
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
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {trackingOrderId && (
        <LiveOrderTrackingModal
          orderId={trackingOrderId}
          onClose={() => setTrackingOrderId(null)}
          viewerRole="customer"
        />
      )}
    </div>
  );
};