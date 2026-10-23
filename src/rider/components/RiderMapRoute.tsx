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
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50 shadow-xs">
      {/* Visual Simulated Route Map Canvas */}
      <div className="h-52 sm:h-60 bg-gradient-to-b from-orange-50/40 via-white to-emerald-50/40 relative overflow-hidden flex items-center justify-center">
        {/* Subtle Map Grid lines */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Curved animated SVG polyline */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d="M 60,150 Q 200,30 380,100 T 560,80"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeDasharray="6 4"
            className="animate-pulse"
          />
        </svg>

        {/* Store Node */}
        <div className="absolute left-8 sm:left-14 bottom-8 flex flex-col items-center">
          <div className="p-2.5 rounded-full bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-4 ring-orange-100">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="mt-1 text-[10px] sm:text-[11px] font-bold text-orange-700 bg-white/95 px-2 py-0.5 rounded-full border border-orange-200 shadow-2xs">
            Pickup Store
          </span>
        </div>

        {/* In-transit Rider Marker */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="p-2.5 rounded-full bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-4 ring-amber-100 animate-bounce">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 rotate-45" />
          </div>
          <span className="mt-1 text-[10px] font-mono font-bold text-slate-800 bg-white/95 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
            {distanceKm} km • ~12 min
          </span>
        </div>

        {/* Customer Node */}
        <div className="absolute right-8 sm:right-14 top-8 flex flex-col items-center">
          <div className="p-2.5 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-4 ring-emerald-100">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="mt-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-white/95 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            Customer
          </span>
        </div>

        {/* Turn-by-Turn GPS Button Overlay */}
        <div className="absolute bottom-3 right-3">
          <button
            onClick={openNavigation}
            className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Google Maps</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </button>
        </div>
      </div>

      {/* Target Destination Bar */}
      <div className="p-3 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Navigating to:</span>
          <span className="text-slate-900 font-bold truncate">{targetLabel}</span>
        </div>
        <span className="text-slate-500 shrink-0 font-mono text-[11px] font-medium">{distanceKm} km away</span>
      </div>
    </div>
  );
};
