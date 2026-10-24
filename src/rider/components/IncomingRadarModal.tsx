import React, { useState, useEffect, useMemo } from 'react';
import { useRider } from '../context/RiderContext';
import { MapPin, Navigation, IndianRupee, Store, X, Zap, CheckCircle2, Clock, Package, ArrowRight } from 'lucide-react';

function calculateHaversineKm(lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null): number | null {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const IncomingRadarModal: React.FC = () => {
  const { incomingBroadcast, acceptOrder, declineOrder, profile } = useRider();
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Lock countdown timer to the unique broadcast ID to prevent polling resets
  const currentBroadcastId = incomingBroadcast?.id;

  useEffect(() => {
    if (!currentBroadcastId) {
      setSecondsLeft(30);
      setClaimError(null);
      return;
    }

    setSecondsLeft(30);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          declineOrder(currentBroadcastId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentBroadcastId, declineOrder]);

  // Two-Leg Route Calculations (Rapido / Swiggy Architecture)
  const routeMetrics = useMemo(() => {
    if (!incomingBroadcast) return null;

    // Leg 1: Rider's Current GPS ➔ Merchant Store (Pickup)
    const pickupDist = calculateHaversineKm(
      profile?.currentLat,
      profile?.currentLng,
      incomingBroadcast.pickupLat,
      incomingBroadcast.pickupLng
    ) ?? 1.2;

    // Leg 2: Merchant Store ➔ Customer Doorstep (Dropoff)
    const dropDist = calculateHaversineKm(
      incomingBroadcast.pickupLat,
      incomingBroadcast.pickupLng,
      incomingBroadcast.dropoffLat,
      incomingBroadcast.dropoffLng
    ) ?? (incomingBroadcast.distanceKm || 3.2);

    const totalDist = Math.round((pickupDist + dropDist) * 10) / 10;
    const pickupMins = Math.max(2, Math.round((pickupDist / 22) * 60));
    const dropMins = Math.max(3, Math.round((dropDist / 22) * 60));
    const totalMins = pickupMins + dropMins + 3; // +3 min store pickup buffer

    return {
      pickupDist: pickupDist.toFixed(1),
      pickupMins,
      dropDist: dropDist.toFixed(1),
      dropMins,
      totalDist: totalDist.toFixed(1),
      totalMins,
    };
  }, [incomingBroadcast, profile?.currentLat, profile?.currentLng]);

  if (!incomingBroadcast || !routeMetrics) return null;

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
  const items = incomingBroadcast.order?.items || [];
  const totalItemQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border-2 border-orange-500 rounded-3xl shadow-2xl overflow-hidden text-slate-800 relative animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Top Radial Countdown Bar (Smooth 30s linear transition) */}
        <div className="w-full bg-slate-100 h-2">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              secondsLeft <= 8 ? 'bg-red-500' : 'bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500'
            }`}
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
              <Zap className="w-3.5 h-3.5 fill-orange-500 text-orange-500" /> New Delivery Opportunity
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
              secondsLeft <= 8 ? 'bg-red-50 text-red-700 border-red-300 animate-pulse' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <Clock className="w-3.5 h-3.5 text-amber-600" /> {secondsLeft}s left
            </span>
            <button
              onClick={() => declineOrder(incomingBroadcast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Pass offer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Earnings & Trip Overview Summary Card */}
        <div className="p-4 sm:p-6 bg-white space-y-4">
          <div className="flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-850 text-white rounded-2xl p-4 shadow-md">
            <div>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Your Guaranteed Earning</p>
              <div className="flex items-center gap-1 text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5 font-numbers">
                <IndianRupee className="w-6 h-6 stroke-[2.5]" />
                <span>{incomingBroadcast.deliveryFee}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Round Trip</p>
              <p className="text-base sm:text-lg font-black text-white mt-0.5 flex items-center justify-end gap-1.5">
                <Navigation className="w-4 h-4 text-orange-400" />
                <span>{routeMetrics.totalDist} km</span>
                <span className="text-xs text-slate-400 font-medium font-sans">({routeMetrics.totalMins} mins)</span>
              </p>
            </div>
          </div>

          {/* Rapido-Style Two-Leg Route Breakdown */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Trip Route Breakdown (2-Legs)</span>
              <span className="text-orange-600 font-bold font-mono">Live Distance</span>
            </div>

            {/* Leg 1: Rider to Store (Pickup) */}
            <div className="flex items-start gap-3 relative">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                1
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700 flex items-center gap-1">
                    <Store className="w-3 h-3" /> Pickup from Merchant
                  </span>
                  <span className="text-[11px] font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                    {routeMetrics.pickupDist} km • ~{routeMetrics.pickupMins}m
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">{incomingBroadcast.pickupName}</h4>
                <p className="text-xs text-slate-500 truncate">{incomingBroadcast.pickupAddress}</p>
              </div>
            </div>

            {/* Connecting Step Line */}
            <div className="pl-4 -my-2 flex items-center gap-2">
              <div className="w-0.5 h-6 bg-slate-300 ml-[-1px]" />
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 italic">
                <ArrowRight className="w-3 h-3" /> Pickup & proceed to customer
              </span>
            </div>

            {/* Leg 2: Store to Customer (Delivery) */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                2
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Deliver to Customer
                  </span>
                  <span className="text-[11px] font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                    {routeMetrics.dropDist} km • ~{routeMetrics.dropMins}m
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">{incomingBroadcast.dropoffName}</h4>
                <p className="text-xs text-slate-500 truncate">
                  {incomingBroadcast.dropoffAddress && incomingBroadcast.dropoffAddress.replace(/[,\s]/g, '').length > 0
                    ? incomingBroadcast.dropoffAddress
                    : 'Customer Doorstep'}
                </p>
              </div>
            </div>
          </div>

          {/* Package Contents Overview (No internal prices exposed) */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                <span>Package Contents {totalItemQty > 0 ? `(${totalItemQty} items)` : ''}</span>
              </span>
              <span className="text-[11px] text-amber-700 font-semibold font-mono">
                Order #{incomingBroadcast.order?.orderNumber || 'QUICK'}
              </span>
            </div>

            {items.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {items.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200/70 text-slate-800 text-[11px] font-medium shadow-2xs"
                  >
                    <span className="font-bold text-amber-700">{item.quantity}x</span>
                    <span className="truncate max-w-[200px]">{item.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">Quick-commerce prepared order ready at store counter.</p>
            )}
          </div>

          {/* Conflict Error Message if taken by another partner */}
          {claimError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <span>{claimError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => declineOrder(incomingBroadcast.id)}
              disabled={isClaiming}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition-colors cursor-pointer"
            >
              Pass Offer
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isClaiming}
              className="flex-2 py-3 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Accepting Order...</span>
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

