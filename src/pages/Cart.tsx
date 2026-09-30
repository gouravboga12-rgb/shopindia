import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShieldCheck, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { CheckoutDrawer } from '../components/common/CheckoutDrawer';
import { requireCustomerAuth } from '../lib/customerAuth';

export const CartPage: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, navigateTo } = useApp();
  const isMobile = useIsMobile();
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const cartTotal = getCartTotal();
  const discountVal = couponApplied ? Math.round(cartTotal * 0.1) : 0;
  const deliveryCharges = cartTotal > 500 || cartTotal === 0 ? 0 : 49;
  const finalTotal = cartTotal - discountVal + deliveryCharges;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'WELCOME10') {
      setCouponApplied(true);
      setCouponMsg('Promo code "WELCOME10" applied! 10% instant checkout discount.');
    } else {
      setCouponMsg('Invalid coupon code. Try entering WELCOME10.');
    }
  };

  const handleCheckout = () => {
    if (!requireCustomerAuth('proceed to checkout and place an order')) return;
    setIsCheckoutOpen(true);
  };

  const renderDesktop = () => {
    return (
      <div className="max-w-7xl mx-auto py-8 px-12 text-left select-none text-brand-graphite font-sans">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2.5 font-heading uppercase tracking-wider">
          <ShoppingCart size={20} className="text-brand-blue" />
          <span>Shopping Cart ({cart.length} items)</span>
        </h1>

        {cart.length === 0 ? (
          <div className="w-full py-20 bg-white border border-brand-border rounded-card flex flex-col items-center justify-center text-center p-6 shadow-premium">
            <span className="text-4xl mb-4">🛒</span>
            <h3 className="text-sm font-extrabold text-brand-graphite mb-1.5 font-heading">Your cart is empty</h3>
            <p className="text-xs text-brand-slate max-w-sm mb-6 font-semibold">Explore our fresh catalog categories and fill up your box!</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateTo('home')}
              className="px-5 py-2.5 bg-brand-blue text-white rounded-button text-xs font-extrabold shadow-premium hover:bg-blue-650 transition-colors uppercase tracking-wider"
            >
              Start Shopping
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-8">
            {/* Left: Cart Items List (Span 2) */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                {cart.map(item => {
                  const itemDiscount = Math.round(((item.product.originalPrice - item.product.price) / item.product.originalPrice) * 100);
                  return (
                    <div
                      key={`${item.product.id}-${item.product.deliveryTime || ''}`}
                      className="bg-white border border-brand-border rounded-card p-5 flex gap-5 shadow-premium hover:border-brand-border/80 transition-all relative"
                    >
                      <div className="w-24 h-24 rounded-card overflow-hidden shrink-0 bg-brand-elevated border border-brand-border/40 p-2 flex items-center justify-center shadow-soft">
                        <img src={item.product.image} alt={item.product.title} className="max-h-full max-w-full object-contain" />
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start leading-none pr-8">
                            <h3 className="font-extrabold text-xs text-brand-graphite line-clamp-1 hover:text-brand-blue cursor-pointer font-heading">
                              {item.product.title}
                            </h3>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-brand-slate hover:text-brand-red p-1 transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {item.product.specs?.['Weight'] && (
                            <span className="text-xs text-brand-slate font-extrabold block mt-1">Pack Size: {item.product.specs['Weight']}</span>
                          )}
                          {item.product.deliveryTime && (
                            <span className="text-xs font-extrabold text-brand-green bg-green-50 px-2 py-0.5 rounded w-max mt-2 block shadow-soft border border-brand-green/10 leading-none">
                              Scheduled: {item.product.deliveryTime}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 font-numbers">
                          <div className="flex items-baseline gap-1.5 leading-none">
                            <span className="text-sm font-extrabold text-brand-graphite">₹{item.product.price}</span>
                            {item.product.originalPrice > item.product.price && (
                              <>
                                <span className="text-xs text-brand-slate line-through">₹{item.product.originalPrice}</span>
                                <span className="text-xs font-black text-brand-orange uppercase tracking-wider">{itemDiscount}% off</span>
                              </>
                            )}
                          </div>

                          {/* Plus Minus count */}
                          <div className="flex items-center border border-brand-blue bg-brand-blue text-white rounded-button overflow-hidden text-xs font-bold shadow-soft">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="px-2 py-1.5 hover:bg-blue-600 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={11} strokeWidth={3} />
                            </button>
                            <span className="px-2.5 min-w-full max-w-[20px] text-center select-none">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="px-2 py-1.5 hover:bg-blue-600 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={11} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Pricing Receipt column (Span 1) */}
            <div className="col-span-1 flex flex-col gap-5">
              {/* Coupon card */}
              <div className="bg-white border border-brand-border rounded-card p-5 shadow-premium">
                <span className="text-brand-graphite font-black text-xs uppercase tracking-wider flex items-center gap-2 mb-3.5 font-heading border-b pb-2">
                  <Ticket size={15} className="text-brand-orange" />
                  Apply Coupon Code
                </span>
                <form onSubmit={handleApplyCoupon} className="flex gap-2 leading-none">
                  <input
                    type="text"
                    placeholder="Enter code e.g. WELCOME10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full px-3.5 py-2 border border-brand-border bg-slate-50 rounded-input text-xs font-bold focus:outline-none focus:border-brand-blue"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-5 bg-brand-blue text-white rounded-button text-xs font-black uppercase tracking-wider"
                  >
                    Apply
                  </motion.button>
                </form>
                {couponMsg && (
                  <span className={`text-xs font-bold block mt-2.5 leading-normal ${couponApplied ? 'text-brand-green' : 'text-brand-red'}`}>
                    {couponMsg}
                  </span>
                )}
              </div>

              {/* Bill Details */}
              <div className="bg-white border border-brand-border rounded-card p-5 shadow-premium flex flex-col gap-4 font-numbers select-none">
                <span className="text-brand-graphite font-black text-xs uppercase tracking-wider font-heading border-b border-brand-border/10 pb-2 text-left">
                  Bill & Pricing Receipt
                </span>
                <div className="flex flex-col gap-2.5 text-xs text-brand-slate font-bold">
                  <div className="flex justify-between items-center">
                    <span>Items Subtotal</span>
                    <span className="text-brand-graphite">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between items-center text-brand-green">
                      <span>Promo (WELCOME10 - 10%)</span>
                      <span>- ₹{discountVal.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-b border-brand-border pb-3.5">
                    <span>Delivery Charges</span>
                    <span className={deliveryCharges === 0 ? 'text-brand-green' : 'text-brand-graphite'}>
                      {deliveryCharges === 0 ? 'FREE' : `₹${deliveryCharges}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-brand-graphite pt-1 leading-none">
                    <span>Total Amount to Pay</span>
                    <span>₹{finalTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="border-t border-brand-border pt-4 flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleCheckout}
                    className="w-full py-3.5 bg-brand-green hover:bg-emerald-650 text-white rounded-button text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-premium"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={14} />
                  </motion.button>
                  <div className="flex gap-2.5 items-center justify-center text-xs text-brand-slate font-extrabold select-none">
                    <ShieldCheck size={14} className="text-brand-green" />
                    <span>Safe payments & 100% genuine products</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMobile = () => {
    return (
      <div className="w-full flex flex-col bg-slate-50/50 min-h-screen text-left pb-36 select-none text-brand-graphite font-sans">
        {/* Glassmorphism Header */}
        <div className="px-5 py-4 sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigateTo('home')} className="p-1.5 -ml-1 rounded-full text-slate-600 hover:text-slate-900 active:scale-90 transition-all">
              <ArrowLeft size={18} />
            </button>
            <span className="font-black text-[13px] uppercase tracking-widest font-heading text-zinc-800">
              Shopping Cart <span className="text-brand-slate font-bold">({cart.length})</span>
            </span>
          </div>
          <button onClick={() => navigateTo('home')} className="text-xs font-bold text-brand-blue">
            Add More
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="m-5 py-24 bg-white border border-slate-200/60 rounded-3xl flex flex-col items-center justify-center text-center p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] select-none">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <ShoppingCart size={32} className="text-slate-300" strokeWidth={2} />
            </div>
            <h3 className="text-sm font-black text-zinc-800 mb-2 font-heading tracking-tight">Your cart is empty</h3>
            <p className="text-xs text-slate-500 max-w-[200px] mb-8 font-semibold leading-relaxed">Looks like you haven't added anything to your cart yet.</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateTo('home')}
              className="px-8 py-3.5 bg-[#0A1022] text-white rounded-full text-xs font-bold shadow-[0_4px_14px_rgba(10,16,34,0.3)] tracking-wide transition-colors hover:bg-black"
            >
              Start Shopping
            </motion.button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-5">
            {/* List */}
            <div className="flex flex-col gap-4">
              {cart.map(item => {
                return (
                  <div
                    key={`${item.product.id}-${item.product.deliveryTime || ''}`}
                    className="bg-white border border-slate-200/60 rounded-3xl p-4 flex gap-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] relative"
                  >
                    <div className="w-24 h-24 bg-gradient-to-b from-slate-50 to-white border border-slate-100 rounded-2xl p-2.5 flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                      <div className="absolute inset-0 bg-brand-blue/5 blur-xl rounded-full scale-150 opacity-30 mix-blend-multiply"></div>
                      <img src={item.product.image} alt={item.product.title} className="max-h-full max-w-full object-contain relative z-10 drop-shadow-md" />
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start leading-tight pr-8">
                          <h3 className="font-extrabold text-[13px] text-zinc-800 line-clamp-2 tracking-tight">{item.product.title}</h3>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                        {item.product.deliveryTime && (
                            <span className="text-xs font-bold text-brand-green bg-[#ECFDF5] border border-brand-green/20 px-2 py-0.5 rounded-full w-max mt-2 block shadow-sm">
                              Slot: {item.product.deliveryTime}
                            </span>
                          )}
                      </div>

                      <div className="flex items-end justify-between font-numbers mt-3">
                        <div className="flex items-baseline gap-1.5 leading-none">
                          <span className="text-lg font-black text-zinc-800 tracking-tighter">₹{item.product.price.toLocaleString('en-IN')}</span>
                          {item.product.originalPrice > item.product.price && (
                            <span className="text-xs text-slate-400 line-through font-semibold">₹{item.product.originalPrice.toLocaleString('en-IN')}</span>
                          )}
                        </div>

                        {/* Qty action */}
                        <div className="flex items-center bg-slate-100/80 rounded-full overflow-hidden text-xs font-black shadow-inner border border-slate-200/50">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200/80 text-zinc-600 transition-colors active:scale-90"
                          >
                            <Minus size={12} strokeWidth={3} />
                          </button>
                          <span className="w-6 text-center text-zinc-800">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200/80 text-zinc-600 transition-colors active:scale-90"
                          >
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bill Details */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-4 font-numbers select-none">
              <span className="text-zinc-800 font-black text-xs tracking-widest uppercase font-heading border-b border-slate-100 pb-3 text-left">
                Payment Details
              </span>
              <div className="flex flex-col gap-3.5 text-xs text-slate-500 font-bold">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="text-zinc-800 font-extrabold text-[13px]">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Delivery fee</span>
                  <span className={deliveryCharges === 0 ? 'text-[#17B169] font-black' : 'text-zinc-800'}>
                    {deliveryCharges === 0 ? 'FREE' : `₹${deliveryCharges}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-zinc-900 pt-3 border-t border-slate-100 leading-none">
                  <span>Total Amount</span>
                  <span className="text-lg tracking-tight">₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile checkout floating bar */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-5 py-4 pb-safe flex items-center justify-between z-50 select-none shadow-[0_-8px_25px_-4px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col leading-none font-numbers">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 font-sans">Total Payable</span>
              <span className="text-[22px] font-black text-zinc-900 tracking-tighter">₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCheckout}
              className="px-7 py-3.5 bg-[#17B169] hover:bg-emerald-600 active:scale-95 text-white rounded-full text-[13px] font-black uppercase tracking-wider shadow-[0_4px_14px_rgba(23,177,105,0.35)] flex items-center gap-2 font-heading transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </motion.button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile ? renderMobile() : renderDesktop()}
      <CheckoutDrawer 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        subtotal={cartTotal}
        discount={discountVal}
        delivery={deliveryCharges}
        total={finalTotal}
      />
    </>
  );
};
