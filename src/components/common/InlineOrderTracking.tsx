import React, { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import { RealWorldMap } from './RealWorldMap';
import { Bike, Wrench, Store, RefreshCw } from 'lucide-react';

interface TrackingData {
  deliveryId: string;
  orderId: string;
  orderNumber?: string;
  status: string;
  distanceKm: number;
  deliveryOtp?: string;
  pickup: {
    name: string;
    address: string;
    phone?: string;
    lat: number;
    lng: number;
  };
  dropoff: {
    name: string;
    address: string;
    phone?: string;
    lat: number;
    lng: number;
  };
  rider?: {
    id: string;
    name: string;
    phone?: string;
    avatar?: string;
    vehicleType: string;
    vehicleNumber?: string;
    rating: number;
  } | null;
  currentLocation: {
    lat: number;
    lng: number;
    bearing: number;
    speed: number;
    updatedAt: string;
  };
}

interface InlineOrderTrackingProps {
  orderId: string;
  orderNumber?: string;
  orderStatus: string;
  vertical: 'quick' | 'services' | 'shop';
  initialOtp?: string | null;
  onOtpLoaded?: (otp: string) => void;
}

export const InlineOrderTracking: React.FC<InlineOrderTrackingProps> = ({
  orderId,
  orderStatus,
  vertical,
  initialOtp,
  onOtpLoaded,
}) => {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number; bearing: number; speed: number } | null>(null);
  const [liveStage, setLiveStage] = useState<string>('assigned');

  const isService = vertical === 'services';

  useEffect(() => {
    if (initialOtp && onOtpLoaded) {
      onOtpLoaded(initialOtp);
    }
  }, [initialOtp, onOtpLoaded]);

  const fetchTracking = async () => {
    try {
      const res = await fetch(`/api/tracking/order/${orderId}`);
      if (!res.ok) {
        throw new Error('Delivery dispatch record pending');
      }
      const json: TrackingData = await res.json();
      setData(json);
      setLiveStage(json.status);
      setError(null);
      if (json.deliveryOtp && onOtpLoaded) {
        onOtpLoaded(json.deliveryOtp);
      }
      if (json.currentLocation) {
        setRiderCoords({
          lat: json.currentLocation.lat,
          lng: json.currentLocation.lng,
          bearing: json.currentLocation.bearing || 0,
          speed: json.currentLocation.speed || 0,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dispatch pending');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // Poll every 8 seconds if dispatch is pending or order is still in transit
    const interval = setInterval(() => {
      if (orderStatus !== 'delivered' && orderStatus !== 'completed' && orderStatus !== 'cancelled') {
        fetchTracking();
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [orderId, orderStatus]);

  // Connect to live WebSocket room for telemetry
  useEffect(() => {
    if (!data?.deliveryId) return;

    const socket = getSocket();
    socket.emit('join_delivery', { deliveryId: data.deliveryId });

    const handleLocationUpdate = (payload: { lat: number; lng: number; bearing?: number; speed?: number; stage?: string }) => {
      setRiderCoords({
        lat: payload.lat,
        lng: payload.lng,
        bearing: payload.bearing || 0,
        speed: payload.speed || 0,
      });
      if (payload.stage) {
        setLiveStage(payload.stage);
      }
    };

    const handleStageChange = (payload: { stage: string }) => {
      if (payload.stage) {
        setLiveStage(payload.stage);
      }
    };

    socket.on('delivery:location_update', handleLocationUpdate);
    socket.on('delivery:stage_changed', handleStageChange);

    return () => {
      socket.off('delivery:location_update', handleLocationUpdate);
      socket.off('delivery:stage_changed', handleStageChange);
      socket.emit('leave_delivery', { deliveryId: data.deliveryId });
    };
  }, [data?.deliveryId]);

  const getStageDisplay = (stage: string) => {
    if (isService) {
      switch (stage) {
        case 'broadcasted':
          return { title: 'Assigning Certified Technician 👨‍🔧', color: 'text-amber-700 bg-amber-50' };
        case 'assigned':
        case 'arrived_pickup':
          return { title: 'Technician Confirmed & Preparing Tools 🧰', color: 'text-blue-700 bg-blue-50' };
        case 'picked_up':
          return { title: 'Technician En Route to Your Address 🛠️', color: 'text-emerald-700 bg-emerald-50' };
        case 'arrived_customer':
          return { title: 'Technician Arrived at Location 📍', color: 'text-purple-700 bg-purple-50' };
        case 'delivered':
        case 'completed':
          return { title: 'Service Completed Successfully! ✅', color: 'text-emerald-800 bg-emerald-100' };
        default:
          return { title: 'Service In Progress', color: 'text-slate-700 bg-slate-100' };
      }
    }
    switch (stage) {
      case 'broadcasted':
        return { title: 'Broadcasting to Nearby Riders 🛵', color: 'text-amber-700 bg-amber-50' };
      case 'assigned':
        return { title: 'Partner Heading to Store 🏪', color: 'text-blue-700 bg-blue-50' };
      case 'arrived_pickup':
        return { title: 'Partner at Store (Verifying & Packing) 📦', color: 'text-indigo-700 bg-indigo-50' };
      case 'picked_up':
        return { title: 'Partner On The Way to Customer ⚡', color: 'text-emerald-700 bg-emerald-50' };
      case 'arrived_customer':
        return { title: 'Partner Arrived at Customer Doorstep 🎉', color: 'text-purple-700 bg-purple-50' };
      case 'delivered':
        return { title: 'Delivered Successfully! ✅', color: 'text-emerald-800 bg-emerald-100' };
      default:
        return { title: 'In Transit', color: 'text-slate-700 bg-slate-100' };
    }
  };

  if (loading) {
    return (
      <div className="h-56 bg-slate-50 rounded-2xl border border-brand-border flex flex-col items-center justify-center p-4 text-center">
        <RefreshCw className="w-6 h-6 text-orange-500 animate-spin mb-2" />
        <p className="text-xs font-bold text-slate-700">Connecting to Live Radar...</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Fetching telemetry & map waypoints</p>
      </div>
    );
  }

  // Fallback if vendor hasn't broadcasted to riders yet
  if (!data || error) {
    return (
      <div className="h-56 bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-2xl border border-amber-200/80 p-5 flex flex-col justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            {isService ? <Wrench className="w-5 h-5" /> : <Store className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
              {isService ? 'Service Processing' : 'Store Preparing Order'}
            </span>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">
              {isService ? 'Technician dispatch in progress' : 'Items being packed at store'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Live GPS street tracking activates automatically as soon as the {isService ? 'service partner' : 'delivery partner'} is assigned and dispatched.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-amber-200/60 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Auto-refreshing status
          </span>
          <button
            onClick={() => fetchTracking()}
            className="text-amber-800 font-bold hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>
    );
  }

  const stageInfo = getStageDisplay(liveStage);
  const cleanDropoffAddress =
    data.dropoff.address && data.dropoff.address.replace(/[,\s]/g, '').length > 0
      ? data.dropoff.address
      : 'Customer Doorstep';

  return (
    <div className="space-y-2.5">
      {/* Telemetry Stage & Partner Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-brand-border/70 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${stageInfo.color}`}>
            {stageInfo.title}
          </span>
          {data.rider && (
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              {isService ? <Wrench className="w-3 h-3 text-purple-600" /> : <Bike className="w-3 h-3 text-orange-600" />}
              {data.rider.name}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-[11px] font-black text-emerald-700 font-mono">
            {data.distanceKm} km
          </span>
        </div>
      </div>

      {/* Embedded Swiggy / Zomato Style RealWorldMap */}
      <div className="rounded-2xl overflow-hidden border border-brand-border shadow-sm">
        <RealWorldMap
          pickup={{
            name: data.pickup.name,
            address: data.pickup.address,
            lat: data.pickup.lat,
            lng: data.pickup.lng,
          }}
          dropoff={{
            name: data.dropoff.name,
            address: cleanDropoffAddress,
            lat: data.dropoff.lat,
            lng: data.dropoff.lng,
          }}
          rider={{
            lat: riderCoords?.lat,
            lng: riderCoords?.lng,
            bearing: riderCoords?.bearing,
            speed: riderCoords?.speed,
            name: data.rider?.name,
            vehicleType: data.rider?.vehicleType,
          }}
          currentStage={liveStage}
          height="220px"
          darkMode={false}
          viewerRole="customer"
        />
      </div>
    </div>
  );
};
