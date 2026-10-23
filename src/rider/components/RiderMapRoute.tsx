import React from 'react';
import { ExternalLink } from 'lucide-react';
import { RealWorldMap } from '../../components/common/RealWorldMap';

interface RiderMapRouteProps {
  pickupName: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffName: string;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  riderLat?: number;
  riderLng?: number;
  distanceKm?: number;
  currentStage: 'assigned' | 'arrived_pickup' | 'picked_up' | 'arrived_customer' | 'delivered';
}

export const RiderMapRoute: React.FC<RiderMapRouteProps> = ({
  pickupName,
  pickupAddress,
  pickupLat = 17.3732,
  pickupLng = 78.5385,
  dropoffName,
  dropoffAddress,
  dropoffLat = 17.3912,
  dropoffLng = 78.5285,
  riderLat,
  riderLng,
  distanceKm = 4.2,
  currentStage,
}) => {
  // Navigation target based on current trip phase
  const isEnRouteToStore = currentStage === 'assigned';
  const cleanDropoffAddress =
    dropoffAddress && dropoffAddress.replace(/[,\s]/g, '').length > 0
      ? dropoffAddress
      : 'Customer Doorstep, Hyderabad';
  const cleanPickupAddress =
    pickupAddress && pickupAddress.replace(/[,\s]/g, '').length > 0
      ? pickupAddress
      : 'Store, Hyderabad';

  const targetLabel = isEnRouteToStore ? `Store: ${pickupName}` : `Customer: ${dropoffName || 'Customer Doorstep'}`;

  const openNavigation = () => {
    // CRITICAL FIX: Prioritize exact decimal coordinates so Google Maps NEVER fails on comma-only or blank addresses!
    const targetLat = isEnRouteToStore ? pickupLat : dropoffLat;
    const targetLng = isEnRouteToStore ? pickupLng : dropoffLng;
    const dest =
      targetLat && targetLng && !isNaN(targetLat)
        ? `${targetLat},${targetLng}`
        : encodeURIComponent(isEnRouteToStore ? cleanPickupAddress : cleanDropoffAddress);

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-xs">
      {/* Real-World Interactive Street Map */}
      <RealWorldMap
        pickup={{
          name: pickupName,
          address: cleanPickupAddress,
          lat: pickupLat,
          lng: pickupLng,
        }}
        dropoff={{
          name: dropoffName || 'Customer Doorstep',
          address: cleanDropoffAddress,
          lat: dropoffLat,
          lng: dropoffLng,
        }}
        rider={{
          lat: riderLat,
          lng: riderLng,
          name: 'You (Partner)',
        }}
        currentStage={currentStage}
        height="240px"
        darkMode={false}
        viewerRole="rider"
        onOpenNavigation={openNavigation}
      />

      {/* Target Destination Bar */}
      <div className="p-3 bg-white border-t border-slate-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Navigating to:</span>
          <span className="text-slate-900 font-bold truncate">{targetLabel}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-slate-500 font-mono text-[11px] font-medium">{distanceKm} km away</span>
          <button
            onClick={openNavigation}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
          >
            <span>Open in Maps</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
