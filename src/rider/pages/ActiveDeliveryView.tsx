import React, { useState, useEffect } from 'react';
import { useRider } from '../context/RiderContext';
import { RiderMapRoute } from '../components/RiderMapRoute';
import { SlideToConfirm } from '../components/SlideToConfirm';
import { getSocket } from '../../lib/socket';
import { api } from '../../lib/api';
import {
  Store,
  MapPin,
  Phone,
  CheckSquare,
  Square,
  KeyRound,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Radio,
  Navigation,
  Banknote,
  CreditCard,
  Loader2
} from 'lucide-react';

export const ActiveDeliveryView: React.FC = () => {
  const { activeDelivery, advanceStage, completeDelivery } = useRider();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [otpInput, setOtpInput] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [completedSuccess, setCompletedSuccess] = useState(false);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [isOnlinePaying, setIsOnlinePaying] = useState(false);
  const [doorstepPaidOnline, setDoorstepPaidOnline] = useState<boolean>(activeDelivery?.order?.paymentStatus === 'paid');
  const [onlinePaymentId, setOnlinePaymentId] = useState<string | null>(null);
  const [onlinePaymentError, setOnlinePaymentError] = useState<string | null>(null);
  const [currentRiderCoords, setCurrentRiderCoords] = useState<{ lat: number; lng: number } | null>(null);

  // High-frequency live GPS streaming to Customer & Vendor via WebSockets
  useEffect(() => {
    if (!activeDelivery?.id) return;

    const socket = getSocket();
    socket.emit('join_delivery', { deliveryId: activeDelivery.id });

    let lastPing = 0;
    let prevCoords: { lat: number; lng: number } | null = null;
    let watchId: number | null = null;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsBroadcastingGps(true);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          if (now - lastPing < 3000) return; // Throttle to 3s interval (battery protection)
          lastPing = now;

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const speed = pos.coords.speed || 0;

          let bearing = 0;
          if (prevCoords) {
            const y = Math.sin(lng - prevCoords.lng) * Math.cos(lat);
            const x = Math.cos(prevCoords.lat) * Math.sin(lat) - Math.sin(prevCoords.lat) * Math.cos(lat) * Math.cos(lng - prevCoords.lng);
            bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
          }
          prevCoords = { lat, lng };
          setCurrentRiderCoords({ lat, lng });

          socket.emit('rider:location_ping', {
            deliveryId: activeDelivery.id,
            lat,
            lng,
            speed,
            bearing,
          });
        },
        (err) => console.warn('Live rider GPS stream error:', err.message),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      socket.emit('leave_delivery', { deliveryId: activeDelivery.id });
    };
  }, [activeDelivery?.id, activeDelivery?.status]);

  if (!activeDelivery) return null;

  const currentStage = activeDelivery.status;

  const toggleItemCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCollectViaRazorpay = async () => {
    if (!activeDelivery?.id) return;
    setIsOnlinePaying(true);
    setOnlinePaymentError(null);
    try {
      const res = await api.post<{
        success: boolean;
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        customer: { name: string; phone: string; email: string };
        orderNumber: string;
        totalINR: number;
      }>(`/api/rider/orders/${activeDelivery.id}/create-doorstep-razorpay-order`, {});

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Razorpay SDK is loading. Please try again in a moment.');
        setIsOnlinePaying(false);
        return;
      }

      const options = {
        key: res.keyId || (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
        amount: res.amount,
        currency: res.currency || 'INR',
        name: 'ShopIndia',
        description: `Doorstep Payment — Order #${res.orderNumber}`,
        image: '/favicon.png',
        order_id: res.orderId,
        prefill: {
          name: res.customer.name,
          contact: res.customer.phone,
          email: res.customer.email,
        },
        theme: { color: '#f97316' },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.post(`/api/rider/orders/${activeDelivery.id}/verify-doorstep-razorpay`, {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setDoorstepPaidOnline(true);
            setOnlinePaymentId(response.razorpay_payment_id);
            setIsOnlinePaying(false);
          } catch (verifyErr: any) {
            setOnlinePaymentError(verifyErr.message || 'Payment signature verification failed.');
            setIsOnlinePaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsOnlinePaying(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setOnlinePaymentError(err.message || 'Failed to initialize Razorpay payment.');
      setIsOnlinePaying(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length !== 4) {
      setOtpError('Please enter a valid 4-digit customer delivery OTP.');
      return;
    }
    setOtpError(null);
    setIsSubmittingOtp(true);
    const result = await completeDelivery(otpInput);
    setIsSubmittingOtp(false);
    if (result.success) {
      setCompletedSuccess(true);
    } else {
      setOtpError(result.error || 'Incorrect OTP code. Please ask the customer to check their app.');
    }
  };

  const pickupLat = activeDelivery.pickupLat || 17.3732;
  const pickupLng = activeDelivery.pickupLng || 78.5385;
  const dropoffLat = activeDelivery.dropoffLat || (pickupLat + 0.015);
  const dropoffLng = activeDelivery.dropoffLng || (pickupLng - 0.008);

  const cleanPickupAddress =
    activeDelivery.pickupAddress && activeDelivery.pickupAddress.replace(/[,\s]/g, '').length > 0
      ? activeDelivery.pickupAddress
      : 'Vendor Store, Hyderabad';

  const cleanDropoffAddress =
    activeDelivery.dropoffAddress && activeDelivery.dropoffAddress.replace(/[,\s]/g, '').length > 0
      ? activeDelivery.dropoffAddress
      : 'Customer Doorstep, Hyderabad';

  const storeNavUrl = (pickupLat && pickupLng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanPickupAddress)}&travelmode=driving`;

  const customerNavUrl = (dropoffLat && dropoffLng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${dropoffLat},${dropoffLng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanDropoffAddress)}&travelmode=driving`;

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">
      
      {/* Active Trip Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">
                Active Quick-Commerce Delivery
              </span>
              {isBroadcastingGps && (
                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1 font-semibold">
                  <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
                  Live GPS Broadcasting
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              Order #{activeDelivery.order?.orderNumber || activeDelivery.orderId.slice(0, 8)}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Guaranteed Fee</span>
            <p className="text-2xl font-black text-emerald-600">₹{activeDelivery.deliveryFee}</p>
          </div>
        </div>

        {/* 4-Stage Progress Stepper */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-[10px] font-bold">
            <div className={`p-1.5 rounded-lg ${currentStage === 'assigned' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-400 bg-slate-50'}`}>
              1. To Store
            </div>
            <div className={`p-1.5 rounded-lg ${currentStage === 'arrived_pickup' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-400 bg-slate-50'}`}>
              2. Pickup & Check
            </div>
            <div className={`p-1.5 rounded-lg ${currentStage === 'picked_up' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-400 bg-slate-50'}`}>
              3. In Transit
            </div>
            <div className={`p-1.5 rounded-lg ${currentStage === 'arrived_customer' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-400 bg-slate-50'}`}>
              4. OTP Handover
            </div>
          </div>
        </div>
      </div>

      {/* Map Navigation Route Visualizer */}
      <RiderMapRoute
        pickupName={activeDelivery.pickupName}
        pickupAddress={cleanPickupAddress}
        pickupLat={pickupLat}
        pickupLng={pickupLng}
        dropoffName={activeDelivery.dropoffName || 'Customer Doorstep'}
        dropoffAddress={cleanDropoffAddress}
        dropoffLat={dropoffLat}
        dropoffLng={dropoffLng}
        riderLat={currentRiderCoords?.lat || activeDelivery.riderLat}
        riderLng={currentRiderCoords?.lng || activeDelivery.riderLng}
        distanceKm={activeDelivery.distanceKm}
        currentStage={currentStage}
      />

      {/* STAGE 1: Heading to Store */}
      {currentStage === 'assigned' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100 shadow-2xs">
                <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-orange-600 tracking-wider">Pickup Location</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{activeDelivery.pickupName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{cleanPickupAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeDelivery.pickupPhone && (
                <a
                  href={`tel:${activeDelivery.pickupPhone}`}
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-orange-600 rounded-2xl transition-colors border border-slate-200"
                  title="Call Store"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
              <a
                href={storeNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl transition-colors border border-blue-200"
                title="1-Tap Google Maps Navigation"
              >
                <Navigation className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="pt-2">
            <SlideToConfirm
              label="Slide to Confirm: Arrived at Store"
              color="orange"
              onConfirm={() => advanceStage('arrived_pickup')}
            />
          </div>
        </div>
      )}

      {/* STAGE 2: Store Handover & Verification Checklist */}
      {currentStage === 'arrived_pickup' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-extrabold text-amber-600 tracking-wider">Item Verification</span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Inspect Packed Items</h3>
              <p className="text-xs text-slate-500">Verify items against the packed bag before sliding</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* Item Checklist */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
            {activeDelivery.order?.items && activeDelivery.order.items.length > 0 ? (
              activeDelivery.order.items.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItemCheck(item.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/60 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                      <span className={`text-xs sm:text-sm ${isChecked ? 'line-through text-slate-400' : 'text-slate-800 font-semibold'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      x{item.quantity}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-500">1x Sealed ShopIndia Delivery Package</p>
            )}
          </div>

          <div className="pt-2">
            <SlideToConfirm
              label="Slide to Confirm: Picked Up & Start"
              color="emerald"
              onConfirm={() => advanceStage('picked_up')}
            />
          </div>
        </div>
      )}

      {/* STAGE 3: In Transit to Customer */}
      {currentStage === 'picked_up' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-2xs">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-emerald-700 tracking-wider">Customer Destination</span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{activeDelivery.dropoffName || 'Customer Doorstep'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{cleanDropoffAddress}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeDelivery.dropoffPhone && (
                <a
                  href={`tel:${activeDelivery.dropoffPhone}`}
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-emerald-600 rounded-2xl transition-colors border border-slate-200"
                  title="Call Customer"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
              <a
                href={customerNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl transition-colors border border-blue-200"
                title="1-Tap Google Maps Navigation"
              >
                <Navigation className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="pt-2">
            <SlideToConfirm
              label="Slide to Confirm: Arrived at Customer"
              color="blue"
              onConfirm={() => advanceStage('arrived_customer')}
            />
          </div>
        </div>
      )}

      {/* STAGE 4: Customer Handover & 4-Digit OTP Verification */}
      {currentStage === 'arrived_customer' && (
        <div className="bg-white border-2 border-emerald-500/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          
          {/* Doorstep Payment Clearance Card (Cash vs Razorpay) */}
          {activeDelivery.order?.total ? (
            doorstepPaidOnline || activeDelivery.order?.paymentStatus === 'paid' ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Payment Verified</span>
                    <h4 className="text-base font-black text-slate-900">
                      ₹{activeDelivery.order.total.toLocaleString('en-IN')} Paid via Razorpay
                    </h4>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 font-medium">
                  Payment settled directly to ShopIndia Admin. <strong>No cash to collect from customer.</strong>
                </p>
                {onlinePaymentId && (
                  <span className="text-[10px] font-mono text-emerald-600 block">
                    Razorpay Ref: {onlinePaymentId}
                  </span>
                )}
              </div>
            ) : (
              <div className="p-4 bg-orange-50/70 border-2 border-orange-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-orange-500 text-white rounded-xl shadow-xs">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-orange-700 tracking-wider">Doorstep Payment (₹{activeDelivery.order.total.toLocaleString('en-IN')})</span>
                      <h4 className="text-sm sm:text-base font-black text-slate-900">
                        Select Collection Method
                      </h4>
                    </div>
                  </div>
                </div>

                {onlinePaymentError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{onlinePaymentError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Option 1: Cash Collection */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Option 1</span>
                      <h5 className="text-xs font-black text-slate-900">Collect Physical Cash</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Collect ₹{activeDelivery.order.total.toLocaleString('en-IN')} cash (added to your COD cash float).</p>
                    </div>
                  </div>

                  {/* Option 2: Razorpay Online Payment */}
                  <div className="p-3 bg-white border-2 border-orange-400 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-orange-600 uppercase">Option 2 (Instant)</span>
                      <h5 className="text-xs font-black text-slate-900">Pay via Razorpay</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Customer pays via UPI, QR, or Card directly to ShopIndia.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isOnlinePaying}
                      onClick={handleCollectViaRazorpay}
                      className="mt-2.5 w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      {isOnlinePaying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Opening Razorpay...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Open Razorpay Modal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : null}

          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-2xs">
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Enter Customer OTP</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ask customer for the 4-digit code shown on their ShopIndia order screen
            </p>
          </div>

          {otpError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div className="flex justify-center">
              <input
                type="text"
                maxLength={4}
                autoFocus
                placeholder="0 0 0 0"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                className="w-48 text-center text-3xl font-mono font-black tracking-widest bg-slate-50 border-2 border-emerald-500 rounded-2xl py-3 text-emerald-700 focus:outline-none focus:bg-white shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingOtp || otpInput.length !== 4}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingOtp ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>VERIFY & COMPLETE DELIVERY (+₹{activeDelivery.deliveryFee})</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Completion Modal / Celebration */}
      {completedSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-emerald-200 rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto mb-3 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-xs">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Delivery Completed!</h3>
            <p className="text-sm text-emerald-600 font-extrabold mt-1">₹{activeDelivery.deliveryFee} Credited to Wallet</p>
            <p className="text-xs text-slate-500 mt-2">
              Great job! Your shift metrics have been updated and you are ready for your next delivery.
            </p>
            <button
              onClick={() => setCompletedSuccess(false)}
              className="w-full mt-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Return to Radar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
