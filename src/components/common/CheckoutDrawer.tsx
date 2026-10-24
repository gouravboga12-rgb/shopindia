import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { X, ChevronRight, ShieldCheck, Loader2 } from 'lucide-react';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({ isOpen, onClose, subtotal, discount, delivery, total }) => {
  const { addresses, addAddress } = useCustomer();
  const { cart, placeOrder } = useApp();
  
  const [selectedAddress, setSelectedAddress] = useState(addresses.find(a => a.isDefault)?.id || addresses[0]?.id || '');
  const [selectedPayment, setSelectedPayment] = useState<'razorpay' | 'COD'>('razorpay');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline forms state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: '', fullName: '', mobile: '', line1: '', city: '', state: '', pincode: '' });

  // If new addresses are added, auto-select them if none selected
  React.useEffect(() => {
    if (!selectedAddress && addresses.length) setSelectedAddress(addresses.find(a => a.isDefault)?.id || addresses[0].id);
  }, [addresses, selectedAddress]);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) return alert('Please select a delivery address');
    if (!selectedPayment) return alert('Please select a payment method');

    setIsSubmitting(true);
    const payload = {
      addressId: selectedAddress,
      paymentMethodId: selectedPayment,
      paymentMethod: selectedPayment === 'COD' ? 'cod' : 'razorpay',
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price
      })),
      total
    };

    try {
      if (selectedPayment === 'COD') {
        await placeOrder(payload);
        onClose();
      } else {
        // Online Payment via Razorpay
        const createdOrder = await placeOrder(payload);
        const orderId = createdOrder?.id;

        if (!orderId) {
          throw new Error('Order creation failed.');
        }

        const res = await api.post<{
          razorpayOrderId: string;
          amount: number;
          currency: string;
          keyId: string;
          orderNumber: string;
        }>('/api/payments/create-order', { orderId });

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
          description: `Order #${res.orderNumber}`,
          image: '/favicon.png',
          order_id: res.razorpayOrderId,
          theme: { color: '#2563eb' },
          handler: async (paymentResponse: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              await api.post('/api/payments/verify', {
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
                orderId,
              });
            } catch (vErr) {
              console.warn('Payment verification notice:', vErr);
            }
            onClose();
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
              onClose();
            },
          },
        };

        const rzp = new Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to place order. Please try again.');
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
            className="fixed inset-y-0 right-0 w-full md:w-full max-w-[450px] bg-white shadow-elevated z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-brand-border">
              <h2 className="font-extrabold text-brand-graphite text-lg font-heading tracking-tight">Checkout</h2>
              <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-4 h-4 text-brand-graphite" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Delivery Address */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-slate font-heading">1. Delivery Address</h3>
                  {!isAddingAddress && (
                    <button onClick={() => setIsAddingAddress(true)} className="text-xs font-bold text-brand-blue hover:underline">Add New</button>
                  )}
                </div>
                
                {isAddingAddress ? (
                  <div className="bg-slate-50 border border-brand-border rounded-xl p-4 space-y-3">
                    <input type="text" placeholder="Full Name" value={newAddr.fullName} onChange={e => setNewAddr({...newAddr, fullName: e.target.value})} className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue" />
                    <input type="text" placeholder="Mobile Number" value={newAddr.mobile} onChange={e => setNewAddr({...newAddr, mobile: e.target.value})} className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue" />
                    <input type="text" placeholder="Flat, House no., Building, Company" value={newAddr.line1} onChange={e => setNewAddr({...newAddr, line1: e.target.value})} className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue" />
                    <div className="flex gap-2">
                      <input type="text" placeholder="City" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} className="w-1/2 text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue" />
                      <input type="text" placeholder="State" value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})} className="w-1/2 text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue" />
                    </div>
                    <input type="text" placeholder="Pincode" value={newAddr.pincode} onChange={e => setNewAddr({...newAddr, pincode: e.target.value})} className="w-full text-xs p-2.5 border border-brand-border rounded-lg outline-none focus:border-brand-blue" />
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => setIsAddingAddress(false)} className="flex-1 py-2 text-xs font-bold text-brand-slate bg-white border border-brand-border rounded-lg">Cancel</button>
                      <button onClick={async () => {
                        if(!newAddr.fullName || !newAddr.mobile || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode) return alert("Please fill all details");
                        await addAddress({ ...newAddr, label: newAddr.label || 'Home', type: 'home', country: 'India', isDefault: true });
                        setIsAddingAddress(false);
                      }} className="flex-1 py-2 text-xs font-bold text-white bg-brand-blue rounded-lg">Save</button>
                    </div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="bg-white border border-dashed border-brand-border rounded-xl p-4 text-center">
                    <p className="text-xs text-brand-slate font-semibold mb-2">No saved addresses found.</p>
                    <button onClick={() => setIsAddingAddress(true)} className="px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-button text-xs font-bold">Add Delivery Address</button>
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

                  {/* Option 2: Cash on Delivery */}
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
                className="w-full py-3.5 bg-brand-green hover:bg-emerald-650 text-white rounded-button text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-premium disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <span>Confirm Order — ₹{total.toLocaleString('en-IN')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex gap-2 items-center justify-center text-xs text-brand-slate font-extrabold mt-3">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
                <span>100% Secure Checkout</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
