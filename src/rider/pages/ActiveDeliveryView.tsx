import React, { useState, useEffect } from 'react';
import { useRider } from '../context/RiderContext';
import { RiderMapRoute } from '../components/RiderMapRoute';
import { SlideToConfirm } from '../components/SlideToConfirm';
import { getSocket } from '../../lib/socket';
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
} from 'lucide-react';

export const ActiveDeliveryView: React.FC = () => {
  const { activeDelivery, advanceStage, completeDelivery } = useRider();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [otpInput, setOtpInput] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [completedSuccess, setCompletedSuccess] = useState(false);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);

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
        pickupAddress={activeDelivery.pickupAddress}
        dropoffName={activeDelivery.dropoffName}
        dropoffAddress={activeDelivery.dropoffAddress}
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
                <p className="text-xs text-slate-500 mt-0.5">{activeDelivery.pickupAddress}</p>
              </div>
            </div>

            {activeDelivery.pickupPhone && (
              <a
                href={`tel:${activeDelivery.pickupPhone}`}
                className="p-3 bg-slate-50 hover:bg-slate-100 text-orange-600 rounded-2xl transition-colors border border-slate-200"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
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
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{activeDelivery.dropoffName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeDelivery.dropoffAddress}</p>
              </div>
            </div>

            {activeDelivery.dropoffPhone && (
              <a
                href={`tel:${activeDelivery.dropoffPhone}`}
                className="p-3 bg-slate-50 hover:bg-slate-100 text-emerald-600 rounded-2xl transition-colors border border-slate-200"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
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
