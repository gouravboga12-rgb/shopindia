import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { getBrowserCoordinates, reverseGeocodeMapbox } from '../../lib/mapbox';
import { X, ChevronRight, ShieldCheck, Loader2, MapPin, CheckCircle2 } from 'lucide-react';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({ isOpen, onClose, subtotal, discount, delivery, total }) => {
  const { addresses, addAddress, profile } = useCustomer();
  const { cart, placeOrder, currentVertical } = useApp();

  const isShopVertical = currentVertical === 'shop' || cart.some(item => ((item.product as any)?.category?.vertical || (item.product as any)?.vertical || '').toLowerCase() === 'shop');
  
  const [selectedAddress, setSelectedAddress] = useState(addresses.find(a => a.isDefault)?.id || addresses[0]?.id || '');
  const [selectedPayment, setSelectedPayment] = useState<'razorpay' | 'COD'>('razorpay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);
  const [detectedCoords, setDetectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Inline forms state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', fullName: '', mobile: '', line1: '', city: '', state: '', pincode: '' });

  // If new addresses are added, auto-select them if none selected
  React.useEffect(() => {
    if (!selectedAddress && addresses.length) setSelectedAddress(addresses.find(a => a.isDefault)?.id || addresses[0].id);
  }, [addresses, selectedAddress]);

  // Ensure ShopIndia e-commerce never defaults to or selects COD
  React.useEffect(() => {
    if (isShopVertical && selectedPayment === 'COD') {
      setSelectedPayment('razorpay');
    }
  }, [isShopVertical, selectedPayment]);

  const handleAutoFillGps = async () => {
    setIsLocating(true);
    setLocationFeedback(null);
    try {
      setIsAddingAddress(true);
      const coords = await getBrowserCoordinates();
      setDetectedCoords(coords);
      const geocoded = await reverseGeocodeMapbox(coords.longitude, coords.latitude);

      const cleanRoad = geocoded.road || '';
      const cleanColony = geocoded.colony || geocoded.village || '';
      const line1 = [cleanRoad, cleanColony].filter(Boolean).join(', ') || geocoded.formattedAddress || '';
      const city = geocoded.city || geocoded.mandal || geocoded.district || '';
      const state = geocoded.state || '';
      const rawPin = geocoded.pincode ? geocoded.pincode.replace(/\D/g, '').slice(0, 6) : '';
      const pincode = rawPin.length === 6 ? rawPin : '';

      setNewAddr(prev => ({
        ...prev,
        fullName: prev.fullName || profile?.name || '',
        mobile: prev.mobile || profile?.phone || '',
        line1: line1 || prev.line1,
        city: city || prev.city,
        state: state || prev.state,
        pincode: pincode || prev.pincode,
      }));

      setLocationFeedback(`GPS Detected: ${city ? city + ', ' : ''}${state}${pincode ? ' - ' + pincode : ''}`);
    } catch (err: any) {
      alert(err.message || 'Could not retrieve GPS location. Please allow browser location access or fill manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return alert('Please select a delivery address');
    if (!selectedPayment) return alert('Please select a payment method');

    setIsSubmitting(true);
    const selectedAddrObj = addresses.find(a => a.id === selectedAddress);

    const payload = {
      addressId: selectedAddress,
      paymentMethodId: selectedPayment,
      paymentMethod: selectedPayment === 'COD' ? 'cod' : 'razorpay',
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      })),
      total,
      latitude: selectedAddrObj?.latitude || detectedCoords?.latitude,
      longitude: selectedAddrObj?.longitude || detectedCoords?.longitude,
    };

    try {
      if (selectedPayment === 'COD') {
        if (isShopVertical) {
          throw new Error('Cash on Delivery is disabled for standard ShopIndia courier orders.');
        }
        await placeOrder(payload);
        onClose();
        return;
      }

      // Online Payment via Razorpay — Atomic Pre-order Intent Flow
      // Does NOT create an order in the database yet.
      const res = await api.post<{
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        receiptNumber: string;
      }>('/api/payments/create-intent', {
        items: payload.items,
        total,
        vertical: currentVertical,
      });

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Razorpay SDK is loading. Please try again in a few moments.');
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: res.keyId || (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
        amount: res.amount,
        currency: res.currency || 'INR',
        name: 'ShopIndia',
        description: `Order Checkout (${res.receiptNumber})`,
        image: '/favicon.png',
        order_id: res.razorpayOrderId,
        theme: { color: '#2563eb' },
        handler: async (paymentResponse: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Atomically verify payment signature and place confirmed order in PostgreSQL
            await placeOrder({
              ...payload,
              paymentMethod: 'razorpay',
              razorpayPayment: {
                orderId: paymentResponse.razorpay_order_id,
                paymentId: paymentResponse.razorpay_payment_id,
                signature: paymentResponse.razorpay_signature,
              }
            });
            onClose();
          } catch (orderErr: any) {
            alert('Payment was processed but order creation encountered an issue: ' + (orderErr.message || 'Please contact support with payment ID: ' + paymentResponse.razorpay_payment_id));
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            // Dismissed without payment: Zero orders created, cart intact
            setIsSubmitting(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Failed to initialize payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-brand-border bg-slate-50/50">
              <h2 className="text-sm font-black text-brand-graphite font-heading">Checkout</h2>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white border border-brand-border flex items-center justify-center text-brand-slate hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Delivery Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-slate font-heading">1. Delivery Address</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={handleAutoFillGps}
                      disabled={isLocating}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                      title="Automatically fill address from device GPS"
                    >
                      {isLocating ? <Loader2 className="w-3 h-3 animate-spin text-emerald-600" /> : <MapPin className="w-3 h-3 text-emerald-600" />}
                      <span>{isLocating ? 'Locating...' : 'Auto-fill with GPS'}</span>
                    </button>
                    {!isAddingAddress && (
                      <button onClick={() => setIsAddingAddress(true)} className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">Add New</button>
                    )}
                  </div>
                </div>

                {locationFeedback && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/90 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{locationFeedback} (review and edit below)</span>
                  </div>
                )}
                
                {isAddingAddress ? (
                  <div className="bg-slate-50 border border-brand-border rounded-xl p-4 space-y-3">
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      value={newAddr.fullName} 
                      onChange={e => setNewAddr({...newAddr, fullName: e.target.value})} 
                      className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue bg-white" 
                    />
                    <input 
                      type="text" 
                      placeholder="Mobile Number" 
                      value={newAddr.mobile} 
                      onChange={e => setNewAddr({...newAddr, mobile: e.target.value})} 
                      className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue bg-white" 
                    />
                    <input 
                      type="text" 
                      placeholder="Flat, House no., Building, Company" 
                      value={newAddr.line1} 
                      onChange={e => setNewAddr({...newAddr, line1: e.target.value})} 
                      className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue bg-white" 
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="City" 
                        value={newAddr.city} 
                        onChange={e => setNewAddr({...newAddr, city: e.target.value})} 
                        className="w-1/2 text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue bg-white" 
                      />
                      <input 
                        type="text" 
                        placeholder="State" 
                        value={newAddr.state} 
                        onChange={e => setNewAddr({...newAddr, state: e.target.value})} 
                        className="w-1/2 text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue bg-white" 
                      />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Pincode (6 Digits)" 
                      value={newAddr.pincode} 
                      onChange={e => setNewAddr({...newAddr, pincode: e.target.value})} 
                      className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue bg-white font-numbers" 
                    />
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => { setIsAddingAddress(false); setLocationFeedback(null); }} 
                        className="flex-1 py-2 text-xs font-bold text-brand-slate bg-white border border-brand-border rounded-lg cursor-pointer hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          if(!newAddr.fullName || !newAddr.mobile || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode) return alert("Please fill all details");
                          await addAddress({ 
                            ...newAddr, 
                            label: newAddr.label || 'Home', 
                            type: 'home', 
                            country: 'India', 
                            latitude: detectedCoords?.latitude, 
                            longitude: detectedCoords?.longitude, 
                            isDefault: true 
                          });
                          setIsAddingAddress(false);
                          setLocationFeedback(null);
                        }} 
                        className="flex-1 py-2 text-xs font-bold text-white bg-brand-blue rounded-lg cursor-pointer hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="bg-white border border-dashed border-brand-border rounded-xl p-4 text-center">
                    <p className="text-xs text-brand-slate font-semibold mb-2">No saved addresses found.</p>
                    <button onClick={() => setIsAddingAddress(true)} className="px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-button text-xs font-bold cursor-pointer">Add Delivery Address</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {addresses.map(addr => (
                      <label key={addr.id} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedAddress === addr.id ? 'border-brand-blue bg-blue-50/50' : 'border-brand-border bg-white hover:border-brand-border/80'}`}>
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedAddress === addr.id ? 'border-brand-blue' : 'border-slate-300'}`}>
                          {selectedAddress === addr.id && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-graphite text-xs">{addr.label || 'Home'}</span>
                            <span className="text-xs text-brand-slate font-bold font-numbers">{addr.mobile}</span>
                            {addr.latitude && addr.longitude && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                <MapPin className="w-2.5 h-2.5 text-emerald-600" /> GPS Pin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-slate mt-0.5 leading-relaxed">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-slate font-heading">2. Payment Method</h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Razorpay Verified</span>
                  </div>
                </div>

                {isShopVertical && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Standard Courier Shipping: Online Payment Only</p>
                      <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                        To ensure verified express logistics via 3PL courier partners, ShopIndia accepts UPI, Google Pay, PhonePe, Cards, NetBanking, and Wallets.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2.5">
                  {/* Option 1: Razorpay Online Payment */}
                  <label 
                    onClick={() => setSelectedPayment('razorpay')}
                    className={`flex items-start justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${selectedPayment === 'razorpay' ? 'border-brand-blue bg-blue-50/50 shadow-xs' : 'border-brand-border bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPayment === 'razorpay' ? 'border-brand-blue' : 'border-slate-300'}`}>
                        {selectedPayment === 'razorpay' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-brand-graphite text-xs">Razorpay Secure Checkout</span>
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Recommended</span>
                        </div>
                        <p className="text-[11px] text-brand-slate mt-0.5 leading-relaxed">
                          Pay directly with UPI (Google Pay, PhonePe, Paytm, CRED), Credit/Debit Cards, NetBanking, or Wallets.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Cash on Delivery — Hidden for ShopIndia e-commerce */}
                  {!isShopVertical && (
                    <label 
                      onClick={() => setSelectedPayment('COD')}
                      className={`flex items-start justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${selectedPayment === 'COD' ? 'border-brand-blue bg-blue-50/50 shadow-xs' : 'border-brand-border bg-white hover:border-slate-300'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPayment === 'COD' ? 'border-brand-blue' : 'border-slate-300'}`}>
                          {selectedPayment === 'COD' && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-brand-graphite text-xs">Cash on Delivery (COD)</span>
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Pay at Doorstep</span>
                          </div>
                          <p className="text-[11px] text-brand-slate mt-0.5 leading-relaxed">
                            Pay with cash or scan the delivery partner's official Razorpay QR at your doorstep.
                          </p>
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Summary */}
            <div className="bg-white border-t border-brand-border p-5 pb-safe">
              <div className="flex flex-col gap-2 mb-4 font-numbers text-xs text-brand-slate font-bold">
                <div className="flex justify-between">
                  <span>Subtotal ({cart.length} items)</span>
                  <span className="text-brand-graphite">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-brand-green">
                    <span>Discount applied</span>
                    <span>- ₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-brand-border pb-3">
                  <span>Delivery Charges</span>
                  <span className={delivery === 0 ? 'text-brand-green' : 'text-brand-graphite'}>{delivery === 0 ? 'FREE' : `₹${delivery}`}</span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-black text-brand-graphite">
                  <span>Total Payable</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button 
                disabled={isSubmitting || !selectedAddress || (!selectedPayment && selectedPayment !== 'COD')}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 bg-brand-green hover:bg-emerald-650 text-white rounded-button text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-premium disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Order — ₹{total.toLocaleString('en-IN')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
                <span>100% Secure Checkout with Razorpay Encrypted Gateway</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
