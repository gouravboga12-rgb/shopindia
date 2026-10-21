import React from 'react';
import { ExternalLink, Navigation, Store, MapPin } from 'lucide-react';

interface RiderMapRouteProps {
  pickupName: string;
  pickupAddress: string;
  dropoffName: string;
  dropoffAddress: string;
  distanceKm?: number;
  currentStage: 'assigned' | 'arrived_pickup' | 'picked_up' | 'arrived_customer' | 'delivered';
}

export const RiderMapRoute: React.FC<RiderMapRouteProps> = ({
  pickupName,
  pickupAddress,
  dropoffName,
  dropoffAddress,
  distanceKm = 4.2,
  currentStage,
}) => {
  // Navigation target based on current trip phase
  const isEnRouteToStore = currentStage === 'assigned';
  const targetDestination = isEnRouteToStore ? pickupAddress : dropoffAddress;
  const targetLabel = isEnRouteToStore ? `Store: ${pickupName}` : `Customer: ${dropoffName}`;

  const openNavigation = () => {
    const encoded = encodeURIComponent(targetDestination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl">
      {/* Visual Simulated Route Map Canvas */}
      <div className="h-56 sm:h-64 bg-slate-900 relative overflow-hidden flex items-center justify-center">
        {/* Subtle Map Grid lines */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:18px_18px]" />

        {/* Curved animated SVG polyline */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d="M 60,160 Q 200,40 380,110 T 560,90"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
        </svg>

        {/* Store Node */}
        <div className="absolute left-10 sm:left-14 bottom-10 flex flex-col items-center">
          <div className="p-2.5 rounded-full bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/50 ring-4 ring-orange-950">
            <Store className="w-5 h-5" />
          </div>
          <span className="mt-1.5 text-[11px] font-bold text-orange-400 bg-slate-900/90 px-2 py-0.5 rounded border border-orange-500/30">
            Pickup Store
          </span>
        </div>

        {/* In-transit Rider Marker */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="p-2.5 rounded-full bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/50 ring-4 ring-amber-950 animate-bounce">
            <Navigation className="w-5 h-5 rotate-45" />
          </div>
          <span className="mt-1 text-[10px] font-mono font-bold text-amber-300 bg-slate-900/90 px-2 py-0.5 rounded border border-amber-500/30">
            {distanceKm} km • ~12 min
          </span>
        </div>

        {/* Customer Node */}
        <div className="absolute right-10 sm:right-14 top-10 flex flex-col items-center">
          <div className="p-2.5 rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/50 ring-4 ring-emerald-950">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="mt-1.5 text-[11px] font-bold text-emerald-400 bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-500/30">
            Customer
          </span>
        </div>

        {/* Turn-by-Turn GPS Button Overlay */}
        <div className="absolute bottom-3 right-3">
          <button
            onClick={openNavigation}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
          >
            <Navigation className="w-4 h-4" />
            <span>Open Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {/* Target Destination Bar */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Navigating to:</span>
          <span className="text-slate-100 font-semibold truncate">{targetLabel}</span>
        </div>
        <span className="text-slate-400 shrink-0 font-mono text-[11px]">{distanceKm} km away</span>
      </div>
    </div>
  );
};
