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
            bearing,
            speed,
            stage: activeDelivery.status,
          });
        },
        (err) => {
          console.warn('Geolocation live stream notice:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
      setIsBroadcastingGps(false);
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
    <div className="max-w-2xl mx-auto space-y-5 pb-24 text-slate-100 animate-in fade-in duration-200">
      
      {/* Active Trip Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Active Quick-Commerce Delivery
              </span>
              {isBroadcastingGps && (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                  Live GPS Broadcasting
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Order #{activeDelivery.order?.orderNumber || activeDelivery.orderId.slice(0, 8)}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Guaranteed Fee</span>
            <p className="text-2xl font-black text-emerald-400">₹{activeDelivery.deliveryFee}</p>
          </div>
        </div>

        {/* 4-Stage Progress Stepper */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-[10px] font-bold">
            <div className={`p-1.5 rounded-lg ${currentStage === 'assigned' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-500'}`}>
              1. To Store
            </div>
            <div className={`p-1.5 rounded-lg ${currentStage === 'arrived_pickup' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-500'}`}>
              2. Pickup & Check
            </div>
            <div className={`p-1.5 rounded-lg ${currentStage === 'picked_up' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-500'}`}>
              3. In Transit
            </div>
            <div className={`p-1.5 rounded-lg ${currentStage === 'arrived_customer' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'text-slate-500'}`}>
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-orange-400 tracking-wider">Pickup Location</span>
                <h3 className="text-lg font-bold text-white">{activeDelivery.pickupName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeDelivery.pickupAddress}</p>
              </div>
            </div>

            {activeDelivery.pickupPhone && (
              <a
                href={`tel:${activeDelivery.pickupPhone}`}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-2xl transition-colors border border-slate-700"
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Item Verification</span>
              <h3 className="text-lg font-bold text-white">Inspect Packed Items</h3>
              <p className="text-xs text-slate-400">Verify items against the packed bag before sliding</p>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          {/* Item Checklist */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2.5">
            {activeDelivery.order?.items && activeDelivery.order.items.length > 0 ? (
              activeDelivery.order.items.map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItemCheck(item.id)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-500" />
                      )}
                      <span className={`text-sm ${isChecked ? 'line-through text-slate-400' : 'text-slate-200 font-medium'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      x{item.quantity}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-400">1x Sealed ShopIndia Delivery Package</p>
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
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Customer Destination</span>
                <h3 className="text-lg font-bold text-white">{activeDelivery.dropoffName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeDelivery.dropoffAddress}</p>
              </div>
            </div>

            {activeDelivery.dropoffPhone && (
              <a
                href={`tel:${activeDelivery.dropoffPhone}`}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-2xl transition-colors border border-slate-700"
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
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-2 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <KeyRound className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Enter Customer OTP</h3>
            <p className="text-xs text-slate-400 mt-1">
              Ask customer for the 4-digit code shown on their ShopIndia order screen
            </p>
          </div>

          {otpError && (
            <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
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
                className="w-48 text-center text-3xl font-mono font-extrabold tracking-widest bg-slate-950 border-2 border-emerald-500/50 rounded-2xl py-3 text-emerald-400 focus:outline-none focus:border-emerald-400 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingOtp || otpInput.length !== 4}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmittingOtp ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto mb-3 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Delivery Completed!</h3>
            <p className="text-sm text-emerald-400 font-bold mt-1">₹{activeDelivery.deliveryFee} Credited to Wallet</p>
            <p className="text-xs text-slate-400 mt-2">
              Great job! Your shift metrics have been updated and you are ready for your next delivery.
            </p>
            <button
              onClick={() => setCompletedSuccess(false)}
              className="w-full mt-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all"
            >
              Return to Radar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
