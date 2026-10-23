import React, { useState, useEffect } from 'react';
import { useRider } from '../context/RiderContext';
import { MapPin, Navigation, IndianRupee, Store, X, Zap, CheckCircle2, Clock } from 'lucide-react';

export const IncomingRadarModal: React.FC = () => {
  const { incomingBroadcast, acceptOrder, declineOrder } = useRider();
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (!incomingBroadcast) {
      setSecondsLeft(30);
      setClaimError(null);
      return;
    }

    setSecondsLeft(30);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          declineOrder(incomingBroadcast.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingBroadcast, declineOrder]);

  if (!incomingBroadcast) return null;

  const handleAccept = async () => {
    setIsClaiming(true);
    setClaimError(null);
    const result = await acceptOrder(incomingBroadcast.id);
    setIsClaiming(false);
    if (!result.success) {
      setClaimError(result.error || 'This order was accepted by another partner.');
      setTimeout(() => {
        declineOrder(incomingBroadcast.id);
      }, 2500);
    }
  };

  const progressPercent = (secondsLeft / 30) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border-2 border-orange-400 rounded-3xl shadow-2xl overflow-hidden text-slate-800 relative animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Top Radial Countdown Bar */}
        <div className="w-full bg-slate-100 h-2">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-orange-700 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-orange-500 text-orange-500" /> New Delivery Broadcast
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3 text-amber-600" /> {secondsLeft}s
            </span>
            <button
              onClick={() => declineOrder(incomingBroadcast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Earnings & Distance Highlight */}
        <div className="p-5 sm:p-6 bg-white">
          <div className="flex items-center justify-between mb-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Guaranteed Payout</p>
              <div className="flex items-center gap-1 text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5">
                <IndianRupee className="w-6 h-6 stroke-[2.5]" />
                <span>{incomingBroadcast.deliveryFee}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-semibold">Est. Trip Distance</p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 flex items-center justify-end gap-1">
                <Navigation className="w-4 h-4 text-orange-600" />
                <span>{incomingBroadcast.distanceKm || 3.5} km</span>
              </p>
            </div>
          </div>

          {/* Pickup & Dropoff Routing Flow */}
          <div className="space-y-4 relative pl-7 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {/* Store Pickup */}
            <div className="relative">
              <div className="absolute -left-7 top-0.5 p-1 bg-orange-50 text-orange-600 rounded-full border border-orange-200">
                <Store className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-orange-600 font-extrabold uppercase tracking-wider">Pickup Point</p>
              <h4 className="text-sm font-bold text-slate-900">{incomingBroadcast.pickupName}</h4>
              <p className="text-xs text-slate-500 truncate">{incomingBroadcast.pickupAddress}</p>
            </div>

            {/* Customer Dropoff */}
            <div className="relative">
              <div className="absolute -left-7 top-0.5 p-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] text-emerald-700 font-extrabold uppercase tracking-wider">Dropoff Destination</p>
              <h4 className="text-sm font-bold text-slate-900">{incomingBroadcast.dropoffName}</h4>
              <p className="text-xs text-slate-500 truncate">{incomingBroadcast.dropoffAddress}</p>
            </div>
          </div>

          {/* Items Summary */}
          {incomingBroadcast.order?.items && incomingBroadcast.order.items.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Package: </span>
              {incomingBroadcast.order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
            </div>
          )}

          {/* Conflict Error Message */}
          {claimError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-shake">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <span>{claimError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => declineOrder(incomingBroadcast.id)}
              disabled={isClaiming}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition-colors cursor-pointer"
            >
              Pass Offer
            </button>
            <button
              onClick={handleAccept}
              disabled={isClaiming}
              className="flex-2 py-3 px-5 sm:px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Locking Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span>ACCEPT DELIVERY (₹{incomingBroadcast.deliveryFee})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
