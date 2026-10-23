import React, { useState, useEffect } from 'react';
import { getSocket } from '../../lib/socket';
import {
  X,
  Bike,
  Store,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  KeyRound,
} from 'lucide-react';
import { RealWorldMap } from './RealWorldMap';

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

interface LiveOrderTrackingModalProps {
  orderId: string;
  onClose: () => void;
  viewerRole?: 'customer' | 'vendor';
}

export const LiveOrderTrackingModal: React.FC<LiveOrderTrackingModalProps> = ({
  orderId,
  onClose,
  viewerRole = 'customer',
}) => {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riderCoords, setRiderCoords] = useState<{ lat: number; lng: number; bearing: number; speed: number } | null>(null);
  const [liveStage, setLiveStage] = useState<string>('assigned');

  // Initial fetch of tracking info
  useEffect(() => {
    let isMounted = true;
    const fetchTracking = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tracking/order/${orderId}`);
        if (!res.ok) throw new Error('Live tracking record not available for this order.');
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setLiveStage(json.status);
          setRiderCoords({
            lat: json.currentLocation.lat,
            lng: json.currentLocation.lng,
            bearing: json.currentLocation.bearing || 0,
            speed: json.currentLocation.speed || 0,
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Tracking unavailable');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTracking();
    return () => { isMounted = false; };
  }, [orderId]);

  // Connect to live WebSocket room for real-time rider GPS pings
  useEffect(() => {
    if (!data?.deliveryId) return;

    const socket = getSocket();
    socket.emit('join_delivery', { deliveryId: data.deliveryId });

    // Rider coordinate update (every ~3s from rider phone)
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

    // Stage change update (picked_up, arrived, delivered)
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

  const getStageTitle = (stage: string) => {
    switch (stage) {
      case 'broadcasted': return 'Searching for Nearby Partner 🛵';
      case 'assigned': return 'Partner Heading to Store 🏪';
      case 'arrived_pickup': return 'Partner at Store (Packing Items) 📦';
      case 'picked_up': return 'Partner On The Way to Customer ⚡';
      case 'arrived_customer': return 'Partner Arrived at Customer Doorstep 🎉';
      case 'delivered': return 'Delivered Successfully! ✅';
      default: return 'In Transit';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-orange-500/20">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Live Dispatch Radar
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Order #{data?.orderNumber || orderId.slice(0, 8)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 mx-auto border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Connecting to live tracking gateway...</p>
            </div>
          ) : error || !data ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">{error || 'Order tracking not found.'}</p>
              <p className="text-xs text-slate-500">
                Live radar tracking is active for Quick-Commerce orders with an assigned delivery partner.
              </p>
            </div>
          ) : (
            <>
              {/* Trip Stage Banner */}
              <div className="bg-gradient-to-r from-slate-850 via-slate-800 to-slate-850 border border-slate-700/60 rounded-2xl p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 font-mono">
                      Current Status
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white mt-0.5">
                      {getStageTitle(liveStage)}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Est. Distance</span>
                    <p className="text-base font-bold text-emerald-400">{data.distanceKm} km</p>
                  </div>
                </div>
              </div>

              {/* Real World Interactive Street Map (Swiggy / Zomato / Uber Style) */}
              <RealWorldMap
                pickup={{
                  name: data.pickup.name,
                  address: data.pickup.address,
                  lat: data.pickup.lat,
                  lng: data.pickup.lng,
                }}
                dropoff={{
                  name: data.dropoff.name,
                  address: data.dropoff.address,
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
                height="260px"
                darkMode={true}
              />

              {/* Customer 4-Digit Verification OTP (Displayed for Customer) */}
              {viewerRole === 'customer' && data.deliveryOtp && (
                <div className="p-4 bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-500/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/30">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                        Customer Delivery OTP
                      </span>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Share this 4-digit code with the partner upon arrival
                      </p>
                    </div>
                  </div>
                  <div className="font-mono text-2xl font-black text-amber-300 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-amber-500/50 shadow-inner tracking-widest">
                    {data.deliveryOtp}
                  </div>
                </div>
              )}

              {/* Assigned Rider Info Card */}
              {data.rider ? (
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0">
                      {data.rider.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-white text-sm">{data.rider.name}</h5>
                        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {data.rider.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {data.rider.vehicleType.toUpperCase()} {data.rider.vehicleNumber ? `• ${data.rider.vehicleNumber}` : ''}
                      </p>
                      <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3" /> ShopIndia Verified Partner
                      </span>
                    </div>
                  </div>

                  {data.rider.phone && (
                    <a
                      href={`tel:${data.rider.phone}`}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Partner</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl text-center text-xs text-slate-400">
                  Searching for nearest available delivery partner in your area...
                </div>
              )}

              {/* Destination Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-850/60 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-orange-400 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> Pickup Store
                  </span>
                  <p className="font-bold text-white truncate">{data.pickup.name}</p>
                  <p className="text-slate-400 text-[11px] line-clamp-1">{data.pickup.address}</p>
                </div>
                <div className="bg-slate-850/60 border border-slate-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Delivery Address
                  </span>
                  <p className="font-bold text-white truncate">{data.dropoff.name}</p>
                  <p className="text-slate-400 text-[11px] line-clamp-1">{data.dropoff.address}</p>
                </div>
              </div>

            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
          >
            Close Radar
          </button>
        </div>

      </div>
    </div>
  );
};
