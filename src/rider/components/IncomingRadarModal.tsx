import React, { useState, useEffect, useMemo } from 'react';
import { useRider } from '../context/RiderContext';
import { MapPin, Navigation, IndianRupee, Store, X, Zap, CheckCircle2, Clock, Package, ArrowRight, Wrench, Eye, Calendar, Lock, ExternalLink } from 'lucide-react';

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

interface IncomingRadarModalProps {
  onNavigateToTab?: (targetTab: string, subTab?: 'trips' | 'cod_history' | 'scheduled_services') => void;
}

export const IncomingRadarModal: React.FC<IncomingRadarModalProps> = ({ onNavigateToTab }) => {
  const { incomingBroadcast, acceptOrder, declineOrder, profile } = useRider();
  const [secondsLeft, setSecondsLeft] = useState(66);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [scheduledSuccessNotice, setScheduledSuccessNotice] = useState<string | null>(null);

  const isServiceJob = incomingBroadcast?.order?.type === 'hvac_service';
  const isUrgentReplacement = incomingBroadcast?.pickupName?.includes('[URGENT REPLACEMENT]');
  const slotTimeStr = incomingBroadcast?.order?.notes || incomingBroadcast?.pickupAddress || '';
  const isInstantMatch = isServiceJob && (incomingBroadcast?.pickupName?.toLowerCase().includes('instant') || slotTimeStr.toLowerCase().includes('instant'));

  // Lock countdown timer to the unique broadcast ID to prevent polling resets
  const currentBroadcastId = incomingBroadcast?.id;

  useEffect(() => {
    if (!currentBroadcastId) {
      setSecondsLeft(66);
      setClaimError(null);
      setScheduledSuccessNotice(null);
      return;
    }

    setSecondsLeft(66);
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
    } else if (result.isScheduled) {
      setScheduledSuccessNotice('Appointment reserved in your Scheduled Services roster! Redirecting...');
      setTimeout(() => {
        declineOrder(incomingBroadcast.id);
        if (onNavigateToTab) {
          onNavigateToTab('orders', 'scheduled_services');
        }
      }, 1400);
    }
  };

  const progressPercent = (secondsLeft / 66) * 100;
  const items = incomingBroadcast.order?.items || [];
  const totalItemQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const destinationLat = incomingBroadcast.dropoffLat || incomingBroadcast.pickupLat;
  const destinationLng = incomingBroadcast.dropoffLng || incomingBroadcast.pickupLng;
  const mapsPreviewUrl = destinationLat && destinationLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-hidden">
      <div className={`w-full max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-800 relative animate-in slide-in-from-bottom-6 duration-300 ${
        isServiceJob ? 'border-2 border-teal-500' : 'border-2 border-orange-500'
      }`}>
        
        {/* Top Radial Countdown Bar (Smooth 66s linear transition) */}
        <div className="w-full bg-slate-100 h-2 shrink-0">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              secondsLeft <= 12 ? 'bg-red-500' : isServiceJob ? 'bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600' : 'bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Glacons Service Mode Header (Instant Match vs. Advance Scheduled) */}
        {isServiceJob && (
          isInstantMatch ? (
            <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white px-4 py-2.5 flex items-center justify-between border-b border-orange-400/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-white/20 rounded-xl shrink-0">
                  <Zap className="w-4 h-4 text-white fill-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-200 block">
                    ⚡ URGENT INSTANT MATCH
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white truncate block">
                    15–30 Min Arrival Requested • Start Navigation Upon Accept
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-white text-orange-950 font-black text-[10px] rounded-full uppercase tracking-wider shadow-2xs shrink-0 ml-2">
                Emergency Job
              </span>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 text-white px-4 py-2.5 flex items-center justify-between border-b border-teal-500/40 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 bg-white/20 rounded-xl shrink-0">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-200 block">
                    🗓️ ADVANCE SCHEDULED SERVICE
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white truncate block">
                    {slotTimeStr || 'Future Service Booking'}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-white text-teal-900 font-black text-[10px] rounded-full uppercase tracking-wider shadow-2xs shrink-0 ml-2">
                Advance Roster
              </span>
            </div>
          )
        )}

        {/* Pinned Modal Header (Always 100% visible on mobile) */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between border-b border-slate-100 bg-white shrink-0 z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isServiceJob ? (isUrgentReplacement ? 'bg-red-400' : 'bg-teal-400') : 'bg-orange-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isServiceJob ? (isUrgentReplacement ? 'bg-red-500' : 'bg-teal-500') : 'bg-orange-500'
                }`}
              ></span>
            </span>
            <span
              className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${
                isServiceJob
                  ? isUrgentReplacement
                    ? 'text-red-700'
                    : 'text-teal-700'
                  : 'text-orange-700'
              }`}
            >
              {isServiceJob ? (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  {isUrgentReplacement ? 'Urgent Replacement Technician Needed' : 'Glacons Service Opportunity'}
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                  New Delivery Opportunity
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                secondsLeft <= 8
                  ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
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

        {/* Scrollable Middle Body (Fits comfortably on all mobile viewports without pushing header off-screen) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-3.5 bg-white">
          {/* Earnings & Trip Overview Summary Card */}
          <div
            className={`flex items-center justify-between text-white rounded-2xl p-3.5 sm:p-4 shadow-md ${
              isServiceJob
                ? 'bg-gradient-to-br from-teal-950 to-slate-900 border border-teal-800/40'
                : 'bg-gradient-to-br from-slate-900 to-slate-850'
            }`}
          >
            <div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {isServiceJob ? 'Guaranteed Technician Pay' : 'Your Guaranteed Earning'}
              </p>
              <div
                className={`flex items-center gap-1 text-2xl sm:text-3xl font-black mt-0.5 font-numbers ${
                  isServiceJob ? 'text-teal-300' : 'text-emerald-400'
                }`}
              >
                <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                <span>{incomingBroadcast.deliveryFee}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {isServiceJob ? 'Site Distance' : 'Total Round Trip'}
              </p>
              <p className="text-sm sm:text-base font-black text-white mt-0.5 flex items-center justify-end gap-1.5">
                <Navigation className={`w-4 h-4 ${isServiceJob ? 'text-teal-400' : 'text-orange-400'}`} />
                <span>{routeMetrics.totalDist} km</span>
                <span className="text-xs text-slate-400 font-medium font-sans">({routeMetrics.totalMins} mins)</span>
              </p>
            </div>
          </div>

          {/* Service Details Card (For HVAC / Glacons Services) */}
          {isServiceJob ? (
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Scheduled Appointment</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(true)}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900 line-clamp-1">{incomingBroadcast.pickupName}</h4>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0">
                    🛠️ Service
                  </span>
                </div>
                <p className="text-xs text-teal-900 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Slot: {incomingBroadcast.order?.notes || incomingBroadcast.pickupAddress || 'As per booking'}</span>
                </p>
                <p className="text-xs text-slate-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{incomingBroadcast.dropoffAddress || 'Customer Doorstep'}</span>
                </p>

                {/* Customer Privacy Protection & Google Maps Navigation Preview */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Customer Contact Protected (Available on Acceptance)</span>
                  </div>
                  {mapsPreviewUrl && (
                    <a
                      href={mapsPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Navigation className="w-3 h-3 text-teal-600" />
                      <span>Preview Area on Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Advance Booking Clarification Notice */}
              <div className="p-2.5 bg-emerald-100/60 border border-emerald-300/80 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                <span className="text-sm shrink-0 mt-0.5">📌</span>
                <p className="leading-snug text-[11px] font-medium">
                  <strong>Advance Booking:</strong> Accepting this reserves the appointment in your <strong>Scheduled Services</strong> roster. You do <em>not</em> need to travel now. Your dashboard will alert you 1–2 hours before time.
                </p>
              </div>
            </div>
          ) : (
            /* Rapido-Style Two-Leg Route Breakdown for Quick Commerce */
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 sm:space-y-4">
              <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Trip Route Breakdown (2-Legs)</span>
                <span className="text-orange-600 font-bold font-mono">Live Distance</span>
              </div>

              {/* Leg 1: Rider to Store (Pickup) */}
              <div className="flex items-start gap-2.5 sm:gap-3 relative">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-orange-700 flex items-center gap-1">
                      <Store className="w-3 h-3" /> Pickup from Merchant
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                      {routeMetrics.pickupDist} km • ~{routeMetrics.pickupMins}m
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{incomingBroadcast.pickupName}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">{incomingBroadcast.pickupAddress}</p>
                </div>
              </div>

              {/* Connecting Step Line */}
              <div className="pl-3.5 sm:pl-4 -my-2 flex items-center gap-2">
                <div className="w-0.5 h-5 sm:h-6 bg-slate-300 ml-[-1px]" />
                <span className="text-[9.5px] sm:text-[10px] text-slate-400 font-medium flex items-center gap-1 italic">
                  <ArrowRight className="w-3 h-3" /> Pickup & proceed to customer
                </span>
              </div>

              {/* Leg 2: Store to Customer (Delivery) */}
              <div className="flex items-start gap-2.5 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Deliver to Customer
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs whitespace-nowrap">
                      {routeMetrics.dropDist} km • ~{routeMetrics.dropMins}m
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{incomingBroadcast.dropoffName}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {incomingBroadcast.dropoffAddress && incomingBroadcast.dropoffAddress.replace(/[,\s]/g, '').length > 0
                      ? incomingBroadcast.dropoffAddress
                      : 'Customer Doorstep'}
                  </p>
                  <div className="pt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" /> Phone & WhatsApp protected until acceptance
                    </span>
                    {mapsPreviewUrl && (
                      <a
                        href={mapsPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded shadow-2xs hover:bg-emerald-50"
                      >
                        <Navigation className="w-3 h-3 text-emerald-600" /> Maps Preview <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Package Contents Overview (No internal prices exposed) */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                <span>Package Contents {totalItemQty > 0 ? `(${totalItemQty} items)` : ''}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 bg-orange-200/80 text-orange-950 font-black rounded-md text-[10px] font-mono border border-orange-300">
                  Token: #{(incomingBroadcast.order?.orderNumber || '').replace(/^OD-/, '').slice(-4) || '9786'}
                </span>
                <span className="text-[10px] text-amber-800 font-medium font-mono hidden sm:inline">
                  (#{incomingBroadcast.order?.orderNumber || 'QUICK'})
                </span>
              </div>
            </div>

            {items.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {items.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-amber-200/70 text-slate-800 text-[10.5px] sm:text-[11px] font-medium shadow-2xs"
                  >
                    <span className="font-bold text-amber-700">{item.quantity}x</span>
                    <span className="truncate max-w-[180px] sm:max-w-[200px]">{item.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-slate-500 italic">Quick-commerce prepared order ready at store counter.</p>
            )}
          </div>

          {/* Conflict Error Message if taken by another partner */}
          {claimError && (
            <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <span>{claimError}</span>
            </div>
          )}
        </div>

        {/* Pinned Sticky Action Footer */}
        <div className="shrink-0 p-3 sm:p-4 bg-white border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex gap-2.5 z-10">
          <button
            type="button"
            onClick={() => declineOrder(incomingBroadcast.id)}
            disabled={isClaiming}
            className="flex-1 py-3 px-3 sm:px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition-colors cursor-pointer"
          >
            Pass Offer
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isClaiming}
            className={`flex-2 py-3 px-4 sm:px-6 rounded-xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
              isServiceJob
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-teal-500/25'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
            }`}
          >
            {isClaiming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Accepting Opportunity...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span>
                  {isInstantMatch
                    ? `ACCEPT & START TRIP (+₹${incomingBroadcast.deliveryFee})`
                    : isServiceJob
                    ? `ACCEPT & RESERVE APPOINTMENT (+₹${incomingBroadcast.deliveryFee})`
                    : `ACCEPT DELIVERY (+₹${incomingBroadcast.deliveryFee})`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Advance Reservation Success Celebration Overlay */}
        {scheduledSuccessNotice && (
          <div className="absolute inset-0 z-40 bg-teal-950/95 backdrop-blur-md text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white">Appointment Reserved!</h3>
            <p className="text-xs text-teal-100 mt-2 max-w-xs leading-relaxed font-medium">
              {scheduledSuccessNotice}
            </p>
            <span className="mt-4 px-3 py-1 bg-white/20 rounded-full text-[11px] font-bold text-teal-200">
              Check "Scheduled Services" Tab Anytime
            </span>
          </div>
        )}

        {/* Detailed Service Job Preview Modal */}
        {showDetailsModal && isServiceJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-teal-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">Glacons Service Job Details</h3>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Service</span>
                  <p className="font-extrabold text-slate-900 text-sm">{incomingBroadcast.pickupName}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Customer Appt. Slot</span>
                  <p className="font-bold text-teal-800 bg-teal-50 p-2 rounded-lg border border-teal-200">
                    {incomingBroadcast.order?.notes || incomingBroadcast.pickupAddress || 'As per booking'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px]">Customer Doorstep Address</span>
                  <p className="font-semibold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {incomingBroadcast.dropoffAddress || 'Customer Doorstep'}
                  </p>
                </div>

                <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-xl font-bold">
                  <span>Guaranteed Technician Payout</span>
                  <span className="text-teal-300 text-base font-extrabold font-numbers">₹{incomingBroadcast.deliveryFee}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

