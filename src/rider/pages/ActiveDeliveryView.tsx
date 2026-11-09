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
  Loader2,
  QrCode,
  X,
  Wrench,
  Play,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

export const ActiveDeliveryView: React.FC = () => {
  const { activeDelivery, advanceStage, completeDelivery, verifyServiceOtp, refreshData } = useRider();
  const isService = activeDelivery?.order?.type === 'hvac_service';
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
  const [cashConfirmed, setCashConfirmed] = useState<boolean>(false);
  const [showCashConfirmModal, setShowCashConfirmModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancellingActive, setIsCancellingActive] = useState<boolean>(false);
  const [qrData, setQrData] = useState<{
    total: number;
    orderNumber: string;
    token: string;
    upiVpa: string;
    upiName: string;
    upiLink: string;
    qrUrl: string;
  } | null>(null);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState<boolean>(false);
  const [currentRiderCoords, setCurrentRiderCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Doorstep Service specific states
  const [serviceStarted, setServiceStarted] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && activeDelivery?.id) {
      return sessionStorage.getItem(`service_started_${activeDelivery.id}`) === 'true';
    }
    return false;
  });
  const [serviceStartTime, setServiceStartTime] = useState<number>(() => {
    if (typeof window !== 'undefined' && activeDelivery?.id) {
      const saved = sessionStorage.getItem(`service_start_time_${activeDelivery.id}`);
      return saved ? parseInt(saved, 10) : Date.now();
    }
    return Date.now();
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [serviceOtpInput, setServiceOtpInput] = useState<string>('');
  const [isVerifyingServiceOtp, setIsVerifyingServiceOtp] = useState<boolean>(false);
  const [serviceOtpError, setServiceOtpError] = useState<string | null>(null);
  const [serviceChecklist, setServiceChecklist] = useState<Record<string, boolean>>({
    inspection: true,
    filterClean: false,
    coilWash: false,
    gasCheck: false,
    finalRunTest: false,
  });

  useEffect(() => {
    if (!serviceStarted) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - serviceStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [serviceStarted, serviceStartTime]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
  };

  const handleVerifyServiceStartPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDelivery?.id || serviceOtpInput.trim().length !== 4) {
      setServiceOtpError('Please enter the 4-digit start PIN provided by customer.');
      return;
    }
    setIsVerifyingServiceOtp(true);
    setServiceOtpError(null);
    const res = await verifyServiceOtp(activeDelivery.id, serviceOtpInput.trim());
    setIsVerifyingServiceOtp(false);
    if (res.success) {
      setServiceStarted(true);
      const now = Date.now();
      setServiceStartTime(now);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`service_started_${activeDelivery.id}`, 'true');
        sessionStorage.setItem(`service_start_time_${activeDelivery.id}`, String(now));
      }
      setOtpInput(serviceOtpInput.trim());
    } else {
      setServiceOtpError(res.error || 'Incorrect PIN code. Please ask the customer for their 4-digit start PIN.');
    }
  };

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

  const handleOpenQrModal = async () => {
    if (!activeDelivery?.id || !activeDelivery.order) return;
    const orderNo = activeDelivery.order.orderNumber || (activeDelivery.orderId ? activeDelivery.orderId.slice(0, 8) : activeDelivery.id.slice(0, 8));
    const token = (orderNo ? orderNo.replace(/^OD-/, '').slice(-4) : '') || '9786';
    const total = activeDelivery.order.total;
    const upiVpa = 'shopindia36@icici';
    const upiName = 'ShopIndia';
    const upiLink = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR&tn=Order_${orderNo}&tr=${activeDelivery.id}`;
    const fallbackQr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(upiLink)}`;

    setQrData({
      total,
      orderNumber: orderNo,
      token,
      upiVpa,
      upiName,
      upiLink,
      qrUrl: fallbackQr,
    });
    setShowQrModal(true);

    try {
      const res = await api.get<{
        success: boolean;
        total: number;
        orderNumber: string;
        token: string;
        upiVpa: string;
        upiName: string;
        upiLink: string;
        qrUrl: string;
      }>(`/api/rider/orders/${activeDelivery.id}/doorstep-payment-info`);
      if (res?.success && res.qrUrl) {
        setQrData(res);
      }
    } catch (e) {
      console.warn('Using dynamic UPI QR fallback:', e);
    }
  };

  const handleConfirmUpiPayment = async () => {
    if (!activeDelivery?.id) return;
    setIsVerifyingUpi(true);
    try {
      await api.post(`/api/rider/orders/${activeDelivery.id}/confirm-doorstep-upi`, {
        upiRef: `UPI-QR-${Date.now()}`,
      });
      setDoorstepPaidOnline(true);
      setOnlinePaymentId(`UPI-QR-VERIFIED`);
      setShowQrModal(false);
      setOtpError(null);
    } catch (err: any) {
      alert(err.message || 'Failed to confirm UPI payment.');
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  const handleCancelActiveDelivery = async () => {
    if (!activeDelivery?.id) return;
    if (!cancelReason || cancelReason.trim().length < 5) {
      alert('Please enter a specific explanation (at least 5 characters). This is transparently logged.');
      return;
    }
    setIsCancellingActive(true);
    try {
      const res: any = await api.post(`/api/rider/orders/${activeDelivery.id}/cancel-active`, {
        reason: cancelReason.trim(),
      });
      if (res?.success) {
        alert(res.message || 'Delivery cancelled and re-broadcasted to nearby partners.');
        await refreshData();
      }
    } catch (e: any) {
      alert(e.message || 'Failed to cancel delivery.');
    } finally {
      setIsCancellingActive(false);
      setShowCancelModal(false);
    }
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

  const isPaidOnline = doorstepPaidOnline || activeDelivery?.order?.paymentStatus === 'paid';
  const isPaymentCleared = isPaidOnline || cashConfirmed;

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPaymentCleared) {
      setOtpError('Please confirm physical cash receipt or Razorpay online payment before verifying OTP.');
      return;
    }
    if (otpInput.length !== 4) {
      setOtpError('Please enter a valid 4-digit customer delivery OTP.');
      return;
    }
    setOtpError(null);
    setIsSubmittingOtp(true);
    const result = await completeDelivery(otpInput, undefined, isPaidOnline ? 'razorpay' : 'cash');
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

  const customerPhone = activeDelivery.dropoffPhone || (activeDelivery.order as any)?.customer?.phone || '';
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const customerWhatsAppUrl = cleanPhone
    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${activeDelivery.dropoffName || 'Customer'}, I am your ShopIndia assigned partner for Order #${activeDelivery.order?.orderNumber || activeDelivery.orderId || ''}.`)}`
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200">

      {/* Active Trip Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">
                {isService ? 'Active Glacons Service Appointment' : 'Active Quick-Commerce Delivery'}
              </span>
              <span className="px-2 py-0.5 bg-orange-100 text-orange-900 border border-orange-300 font-black rounded-lg text-xs font-mono shadow-2xs">
                Token: #{(activeDelivery.order?.orderNumber || activeDelivery.orderId || '').replace(/^OD-/, '').slice(-4) || '9786'}
              </span>
              {isBroadcastingGps && (
                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1 font-semibold">
                  <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
                  Live GPS Broadcasting
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              Order #{activeDelivery.order?.orderNumber || activeDelivery.orderId.slice(0, 8)}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Guaranteed Fee</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600">₹{activeDelivery.deliveryFee}</p>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Cancel Job</span>
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          {isService ? (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-[10px] font-bold">
              <div className={`p-1.5 rounded-lg ${currentStage !== 'arrived_customer' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-slate-400 bg-slate-50'}`}>
                1. Head to Customer
              </div>
              <div className={`p-1.5 rounded-lg ${currentStage === 'arrived_customer' && !serviceStarted ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-slate-400 bg-slate-50'}`}>
                2. Verify Start PIN
              </div>
              <div className={`p-1.5 rounded-lg ${currentStage === 'arrived_customer' && serviceStarted ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-400 bg-slate-50'}`}>
                3. Work & Settle
              </div>
            </div>
          ) : (
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
          )}
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

      {/* ── DOORSTEP SERVICE FLOW (Zero Store Pickup, Zero Item Checklist) ── */}
      {isService && currentStage !== 'arrived_customer' && (
        <div className="bg-white border-2 border-teal-400 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200 shadow-2xs">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold text-teal-700 tracking-wider">
                  Doorstep Service Destination
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{activeDelivery.dropoffName || 'Customer Doorstep'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{cleanDropoffAddress}</p>
                <p className="text-xs text-teal-800 font-bold mt-1">
                  🗓️ Slot: {activeDelivery.order?.notes || activeDelivery.pickupAddress || 'Scheduled Booking'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeDelivery.dropoffPhone && (
                <>
                  <a
                    href={`tel:${activeDelivery.dropoffPhone}`}
                    className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-colors border border-blue-200"
                    title="Call Customer"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                  {customerWhatsAppUrl && (
                    <a
                      href={customerWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl transition-colors border border-emerald-300"
                      title="WhatsApp Customer"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </a>
                  )}
                </>
              )}
              <a
                href={customerNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs"
                title="1-Tap Google Maps Navigation"
              >
                <Navigation className="w-4 h-4" />
                <span>Navigate</span>
              </a>
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 leading-relaxed">
            💡 <strong>Doorstep Service Mode:</strong> Head directly to the customer site. Store pickup & checklist are skipped. Once you arrive at the customer doorstep, slide below to request their 4-digit start PIN.
          </div>

          <div className="pt-2">
            <SlideToConfirm
              label="Slide to Confirm: Arrived at Customer Site"
              color="emerald"
              onConfirm={() => advanceStage('arrived_customer')}
            />
          </div>
        </div>
      )}

      {/* ── STANDARD QUICK-COMMERCE DELIVERY FLOW (Store Pickup & Handover) ── */}
      {!isService && (
        <>
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
                    <>
                      <a
                        href={`tel:${activeDelivery.dropoffPhone}`}
                        className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-colors border border-blue-200"
                        title="Call Customer"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                      {customerWhatsAppUrl && (
                        <a
                          href={customerWhatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl transition-colors border border-emerald-300"
                          title="WhatsApp Customer"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </a>
                      )}
                    </>
                  )}
                  <a
                    href={customerNavUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-colors shadow-sm flex items-center gap-1.5 font-bold text-xs"
                    title="1-Tap Google Maps Navigation"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Navigate</span>
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
        </>
      )}

      {/* ── AT CUSTOMER DOORSTEP ── */}
      {currentStage === 'arrived_customer' && isService && !serviceStarted && (
        <div className="bg-white border-2 border-teal-500 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center border border-teal-200 shadow-2xs">
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-900 font-extrabold rounded-full text-[10px] uppercase tracking-wider">
              Doorstep Arrival Confirmed
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">Enter Customer Start PIN</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ask the customer for the 4-digit start PIN displayed on their ShopIndia service tracking screen to start work.
            </p>
          </div>

          {serviceOtpError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{serviceOtpError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyServiceStartPin} className="space-y-4">
            <div className="flex justify-center">
              <input
                type="text"
                maxLength={4}
                autoFocus
                placeholder="0 0 0 0"
                value={serviceOtpInput}
                onChange={(e) => setServiceOtpInput(e.target.value.replace(/\D/g, ''))}
                className="w-48 text-center text-3xl font-mono font-black tracking-widest border-2 rounded-2xl py-3 focus:outline-none shadow-inner bg-slate-50 border-teal-500 text-teal-800 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifyingServiceOtp || serviceOtpInput.length !== 4}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isVerifyingServiceOtp ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>VERIFY PIN & START SERVICE</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STAGE 4: Customer Handover & 4-Digit OTP Verification / Work Completion */}
      {currentStage === 'arrived_customer' && (!isService || serviceStarted) && (
        <div className="bg-white border-2 border-emerald-500/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">

          {/* Service In Progress Banner & Checklist (For HVAC Service) */}
          {isService && (
            <div className="space-y-3.5">
              <div className="bg-gradient-to-r from-teal-950 to-slate-900 text-white p-4 rounded-2xl flex items-center justify-between border border-teal-700/50 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs">
                    <Wrench className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-300">
                      Work in Progress
                    </span>
                    <h4 className="text-sm font-extrabold text-white">
                      {activeDelivery.order?.items?.[0]?.name || activeDelivery.pickupName || 'Glacons AC Service'}
                    </h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-300 uppercase font-bold block">Elapsed</span>
                  <span className="text-xl font-mono font-black text-emerald-400">
                    {formatElapsed(elapsedSeconds)}
                  </span>
                </div>
              </div>

              {/* Execution Quality Checklist */}
              {(() => {
                const titleLower = (activeDelivery.order?.items?.[0]?.name || activeDelivery.pickupName || '').toLowerCase();
                let checklistItems = [
                  { id: 'siteInspection', label: '1. Initial on-site inspection & problem diagnosis' },
                  { id: 'safetySetup', label: '2. Safety precautions & work area setup' },
                  { id: 'coreService', label: '3. Execution of requested doorstep service/repair' },
                  { id: 'qualityCheck', label: '4. Quality verification & functional testing' },
                  { id: 'customerDemo', label: '5. Work area cleanup & customer sign-off' },
                ];

                if (titleLower.includes('plumb')) {
                  checklistItems = [
                    { id: 'plumb_inspect', label: '1. Site inspection & leak/blockage diagnosis' },
                    { id: 'plumb_valve', label: '2. Main valve shut-off & water pressure check' },
                    { id: 'plumb_repair', label: '3. Pipe fitting / fixture repair or replacement' },
                    { id: 'plumb_seal', label: '4. Joint sealant & leakage testing' },
                    { id: 'plumb_demo', label: '5. Clean work area & operation demo to customer' },
                  ];
                } else if (titleLower.includes('electr')) {
                  checklistItems = [
                    { id: 'elec_safe', label: '1. MCB / circuit safety isolation & earthing test' },
                    { id: 'elec_volt', label: '2. Voltage, socket & wiring continuity check' },
                    { id: 'elec_repair', label: '3. Switch, appliance or wiring repair/replacement' },
                    { id: 'elec_load', label: '4. Load test & thermal inspection' },
                    { id: 'elec_demo', label: '5. Final testing & customer handover' },
                  ];
                } else if (titleLower.includes('ac') || titleLower.includes('hvac') || titleLower.includes('cool')) {
                  checklistItems = [
                    { id: 'ac_safe', label: '1. Initial safety & electrical check' },
                    { id: 'ac_filter', label: '2. High-pressure jet cleaning / filter wash' },
                    { id: 'ac_coil', label: '3. Evaporator & outdoor coil deep clean' },
                    { id: 'ac_gas', label: '4. Gas pressure & airflow test' },
                    { id: 'ac_demo', label: '5. Post-service cooling run test with customer' },
                  ];
                }

                return (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-1.5">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                      Execution Quality Checklist
                    </span>
                    {checklistItems.map((chk) => {
                      const isChecked = !!serviceChecklist[chk.id];
                      return (
                        <button
                          key={chk.id}
                          type="button"
                          onClick={() => setServiceChecklist(prev => ({ ...prev, [chk.id]: !prev[chk.id] }))}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/70 text-left transition-colors cursor-pointer"
                        >
                          <span className={`text-xs ${isChecked ? 'line-through text-slate-400' : 'text-slate-800 font-semibold'}`}>
                            {chk.label}
                          </span>
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Doorstep Payment Clearance Card (Cash vs Razorpay) */}
          {activeDelivery.order?.total ? (
            isPaidOnline ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Payment Verified</span>
                    <h4 className="text-base font-black text-slate-900">
                      {isService ? 'Paid Online via Razorpay' : `₹${activeDelivery.order.total.toLocaleString('en-IN')} Paid via Razorpay`}
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
            ) : cashConfirmed ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Physical Cash Received</span>
                      <h4 className="text-base font-black text-slate-900">
                        ₹{activeDelivery.order.total.toLocaleString('en-IN')} Cash in Hand
                      </h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCashConfirmed(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                <p className="text-xs text-emerald-800 font-medium">
                  Physical cash confirmed. This amount is kept with you and deducted from your wallet balance. OTP verification is now unlocked.
                </p>
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
                        Select &amp; Confirm Payment Method
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
                      <p className="text-[11px] text-slate-500 mt-0.5">Customer pays ₹{activeDelivery.order.total.toLocaleString('en-IN')} cash.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCashConfirmModal(true)}
                      className="mt-2.5 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Collect Cash (₹{activeDelivery.order.total.toLocaleString('en-IN')})</span>
                    </button>
                  </div>

                  {/* Option 2: Doorstep Dynamic UPI QR & Razorpay */}
                  <div className="p-3 bg-white border-2 border-orange-400 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-orange-600 uppercase">Option 2 (Instant)</span>
                      <h5 className="text-xs font-black text-slate-900">Pay via UPI QR / Online</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">Scan QR with GPay / PhonePe / Paytm or pay by Card.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenQrModal}
                      className="mt-2.5 w-full py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Show UPI QR Code</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : null}

          {/* Cash Confirmation Modal Popup */}
          {showCashConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-orange-500 space-y-4 animate-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                  <Banknote className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-black text-slate-900">Confirm Cash Receipt</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Have you collected <strong className="text-slate-900 font-extrabold font-mono">₹{activeDelivery.order?.total?.toLocaleString('en-IN')}</strong> physical cash in hand from the customer?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This amount is collected and kept by you, and will be deducted from your wallet balance.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCashConfirmModal(false)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCashConfirmed(true);
                      setShowCashConfirmModal(false);
                      setOtpError(null);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Yes, Cash Received
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Doorstep Dynamic UPI QR Payment Modal (Option A) */}
          {showQrModal && qrData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-orange-500 space-y-4 animate-in zoom-in-95 relative">

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-950 font-black rounded-full text-xs mb-2">
                    <QrCode className="w-3.5 h-3.5 text-orange-600" />
                    <span>Customer UPI QR Code</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 font-mono">
                    ₹{qrData.total.toLocaleString('en-IN')}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Order #{qrData.orderNumber} • Token #{qrData.token}
                  </p>
                </div>

                {/* QR Code Display */}
                <div className="bg-gradient-to-b from-orange-50 to-amber-50 p-4 rounded-2xl border-2 border-orange-200 flex flex-col items-center justify-center shadow-inner">
                  <div className="bg-white p-2.5 rounded-2xl shadow-md border border-slate-200">
                    <img
                      src={qrData.qrUrl}
                      alt="UPI QR Code"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
                      loading="eager"
                    />
                  </div>

                  {/* Supported UPI Apps Pills */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center text-[10px] font-bold text-slate-600">
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">Google Pay</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">PhonePe</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">Paytm</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md">BHIM</span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 mt-1.5 text-center font-medium">
                    Point any UPI app scanner at this QR to pay directly to ShopIndia.
                  </p>
                </div>

                {/* Confirmation & Secondary Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isVerifyingUpi}
                    onClick={handleConfirmUpiPayment}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isVerifyingUpi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Payment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Payment Received (Unlock OTP)</span>
                      </>
                    )}
                  </button>

                  {/* Fallback to Razorpay Cards / Netbanking */}
                  <button
                    type="button"
                    disabled={isOnlinePaying}
                    onClick={() => {
                      setShowQrModal(false);
                      handleCollectViaRazorpay();
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pay via Card / Netbanking (Razorpay)</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-2xs">
              <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Enter Customer OTP</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ask customer for the 4-digit code shown on their ShopIndia order screen
            </p>
          </div>

          {!isPaymentCleared && activeDelivery.order?.paymentMethod === 'cod' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold text-center">
              🔒 Payment Pending: Please confirm physical cash receipt or collect via UPI QR / Razorpay above to unlock OTP entry.
            </div>
          )}

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
                disabled={!isPaymentCleared}
                autoFocus={isPaymentCleared}
                placeholder="0 0 0 0"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                className={`w-48 text-center text-3xl font-mono font-black tracking-widest border-2 rounded-2xl py-3 focus:outline-none shadow-inner ${isPaymentCleared
                    ? 'bg-slate-50 border-emerald-500 text-emerald-700 focus:bg-white'
                    : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingOtp || otpInput.length !== 4 || !isPaymentCleared}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmittingOtp ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {isService
                      ? `VERIFY & COMPLETE SERVICE (+₹${activeDelivery.deliveryFee})`
                      : `VERIFY & COMPLETE DELIVERY (+₹${activeDelivery.deliveryFee})`}
                  </span>
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

      {/* MANDATORY CANCELLATION REASON MODAL (INSTANT RE-BROADCAST) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-base text-slate-900">Cancel & Release Delivery</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 leading-relaxed">
              ⚠️ If you cannot complete this order (e.g. vehicle puncture, emergency, or distance issue), it will be <strong>immediately re-broadcasted</strong> to find another nearby partner.
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Cancellation Reason (Required):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {['Vehicle Breakdown / Puncture', 'Sudden Family Emergency', 'Customer Asked to Reschedule', 'Heavy Rain / Bad Weather'].map((quickOption) => (
                  <button
                    key={quickOption}
                    type="button"
                    onClick={() => setCancelReason(quickOption)}
                    className={`p-2 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                      cancelReason === quickOption
                        ? 'bg-rose-50 border-rose-500 text-rose-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {quickOption}
                  </button>
                ))}
              </div>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Or type specific reason (at least 5 characters)..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancellingActive}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelActiveDelivery}
                disabled={isCancellingActive || !cancelReason || cancelReason.trim().length < 5}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCancellingActive ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Re-broadcasting...</span>
                  </>
                ) : (
                  <span>Confirm & Re-Broadcast</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
