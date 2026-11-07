import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';
import { PageHeader, EmptyState, PrimaryButton } from '../../components/dashboard/DashboardUI';
import { ShoppingCart, Trash2, Plus, Minus, Bookmark, Heart, ShieldCheck, ArrowRight } from 'lucide-react';
import { trackEvent } from '../../lib/customerApi';

export const CartPage: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, getCartTotal, clearCart, navigateTo } = useApp();
  const { saveForLater, moveToWishlist, wishlist } = useCustomer();
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [pricingConfig, setPricingConfig] = useState<any>({
    shiprocket_base_fee: 49,
    shiprocket_free_threshold: 499
  });

  useEffect(() => {
    fetch('/api/orders/pricing-config')
      .then(r => r.json())
      .then(d => {
        if (d?.settings) {
          setPricingConfig(d.settings);
        }
      })
      .catch(() => {});
  }, []);

  const subtotal = getCartTotal();
  const discount = applied ? Math.round(subtotal * 0.1) : 0;
  const tax = Math.round(subtotal * 0.12);
  const baseFee = parseFloat(pricingConfig.shiprocket_base_fee) || 49;
  const freeThreshold = parseFloat(pricingConfig.shiprocket_free_threshold) || 499;
  const shipping = subtotal === 0 || (subtotal - discount) >= freeThreshold ? 0 : baseFee;
  const total = subtotal - discount + tax + shipping;

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (coupon.toUpperCase() === 'WELCOME10') {
      setApplied(true);
      setMsg('Coupon WELCOME10 applied — 10% off.');
    } else {
      setApplied(false);
      setMsg('Invalid code. Try WELCOME10.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Shopping Cart" subtitle={`${cart.length} item${cart.length === 1 ? '' : 's'} in your basket`} />

      {cart.length === 0 && (
        <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="Your cart is empty" message="Add products from the store to get started." />
      )}

      {cart.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-3">
            {cart.map((item) => {
              const isWish = wishlist.includes(item.product.id);
              return (
                <div key={item.product.id} className="bg-white border border-brand-border rounded-card shadow-premium p-4 flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-50 border border-brand-border/50">
                    <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-brand-graphite line-clamp-2 font-heading">{item.product.title}</h3>
                      <button onClick={() => removeFromCart(item.product.id)} aria-label="Remove" className="text-brand-slate hover:text-red-500 p-1 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1 font-numbers">
                      <span className="font-extrabold text-brand-graphite">₹{item.product.price.toLocaleString('en-IN')}</span>
                      {item.product.originalPrice > item.product.price && (
                        <span className="text-xs text-brand-slate line-through">₹{item.product.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-brand-blue bg-brand-blue text-white rounded-button overflow-hidden text-xs font-bold">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-2 py-1.5 hover:bg-blue-700" aria-label="Decrease"><Minus className="w-3 h-3" /></button>
                        <span className="px-2.5 min-w-full max-w-[20px] text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-2 py-1.5 hover:bg-blue-700" aria-label="Increase"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="text-sm font-extrabold font-numbers text-brand-graphite">₹{(item.product.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-brand-border/40">
                      <button onClick={() => { saveForLater(item.product.id); removeFromCart(item.product.id); }} className="inline-flex items-center gap-1 text-xs font-bold text-brand-slate hover:text-brand-blue"><Bookmark className="w-3.5 h-3.5" /> Save for later</button>
                      <button onClick={() => { moveToWishlist(item.product.id); }} className="inline-flex items-center gap-1 text-xs font-bold text-brand-slate hover:text-red-500">{isWish ? '✓ In wishlist' : 'Move to wishlist'} {!isWish && <Heart className="w-3.5 h-3.5" />}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-brand-border rounded-card shadow-premium p-5">
              <p className="font-extrabold text-xs uppercase tracking-wider text-brand-graphite mb-3">Apply Coupon</p>
              <form onSubmit={applyCoupon} className="flex gap-2">
                <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter code" className="w-full px-3 py-2 border border-brand-border bg-slate-50 rounded-button text-xs font-bold focus:outline-none focus:border-brand-blue" />
                <button type="submit" className="px-4 bg-brand-blue text-white rounded-button text-xs font-bold">Apply</button>
              </form>
              {msg && <p className={`text-xs font-bold mt-2 ${applied ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</p>}
            </div>

            <div className="bg-white border border-brand-border rounded-card shadow-premium p-5 space-y-3">
              <p className="font-extrabold text-xs uppercase tracking-wider text-brand-graphite">Price Details</p>
              <div className="space-y-2 text-xs text-brand-slate">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-bold text-brand-graphite font-numbers">₹{subtotal.toLocaleString('en-IN')}</span></div>
                {applied && <div className="flex justify-between text-emerald-600"><span>Coupon (WELCOME10)</span><span className="font-bold font-numbers">-₹{discount.toLocaleString('en-IN')}</span></div>}
                <div className="flex justify-between"><span>Tax (GST 12%)</span><span className="font-bold text-brand-graphite font-numbers">₹{tax.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span className={`font-bold ${shipping === 0 ? 'text-emerald-600' : 'text-brand-graphite'} font-numbers`}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
                <div className="border-t border-brand-border pt-2 flex justify-between items-center">
                  <span className="font-bold text-brand-graphite">Grand Total</span>
                  <span className="font-extrabold text-brand-blue text-sm font-numbers">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <PrimaryButton
                onClick={() => { trackEvent('CHECKOUT_STARTED'); clearCart(); navigateTo('orders'); }}
                className="w-full py-3.5 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <ArrowRight className="w-4 h-4" /> Proceed to Checkout
              </PrimaryButton>
              <div className="flex items-center justify-center gap-2 text-xs text-brand-slate font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Safe & secured payments
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};