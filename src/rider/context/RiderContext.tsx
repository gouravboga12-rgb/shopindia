import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { detectCurrentLocationWithMapbox } from '../../lib/mapbox';

export interface RiderProfileData {
  id: string;
  partnerType?: 'delivery' | 'service' | 'both' | string;
  skills?: string[];
  experienceYears?: number;
  vehicleType: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  isOnline: boolean;
  isApproved: boolean;
  serviceRadiusKm: number;
  walletBalance: number;
  totalDeliveries: number;
  rating: number;
  address?: string;
  currentLat?: number;
  currentLng?: number;
  codCashFloat?: number;
  codFloatLimit?: number;
}

export interface DeliveryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface ActiveDeliveryData {
  id: string;
  orderId: string;
  status: 'assigned' | 'arrived_pickup' | 'picked_up' | 'arrived_customer' | 'delivered';
  deliveryFee: number;
  distanceKm: number;
  pickupName: string;
  pickupAddress: string;
  pickupPhone?: string;
  dropoffName: string;
  dropoffAddress: string;
  dropoffPhone?: string;
  order?: {
    orderNumber: string;
    total: number;
    items?: DeliveryItem[];
    vendor?: { businessName: string; phone?: string; street?: string; city?: string };
  };
}

export interface BroadcastDelivery {
  id: string;
  orderId: string;
  deliveryFee: number;
  distanceKm: number;
  pickupName: string;
  pickupAddress: string;
  dropoffName: string;
  dropoffAddress: string;
  order?: {
    orderNumber: string;
    total: number;
    type: string;
    items?: DeliveryItem[];
    vendor?: { businessName: string; phone?: string; street?: string; city?: string };
  };
}

interface RiderContextType {
  profile: RiderProfileData | null;
  isOnline: boolean;
  toggleOnline: () => Promise<void>;
  updateRadius: (radiusKm: number) => Promise<void>;
  updatePartnerProfile: (data: Partial<RiderProfileData>) => Promise<boolean>;
  activeDelivery: ActiveDeliveryData | null;
  incomingBroadcast: BroadcastDelivery | null;
  acceptOrder: (deliveryId: string) => Promise<{ success: boolean; error?: string }>;
  declineOrder: (deliveryId: string) => void;
  advanceStage: (nextStage: 'arrived_pickup' | 'picked_up' | 'arrived_customer') => Promise<void>;
  completeDelivery: (otp: string, photoProofUrl?: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  updateGpsLocation: () => Promise<{ success: boolean; address?: string; error?: string }>;
  playChime: () => void;
}

const RiderContext = createContext<RiderContextType | undefined>(undefined);

// Web Audio API Dispatch Chime Synthesizer
function playDispatchChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.2); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.4); // D6
    gain2.gain.setValueAtTime(0.35, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Audio chime playback failed:', e);
  }
}

export const RiderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<RiderProfileData | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [activeDelivery, setActiveDelivery] = useState<ActiveDeliveryData | null>(null);
  const [incomingBroadcast, setIncomingBroadcast] = useState<BroadcastDelivery | null>(null);
  const dismissedOrderIds = useRef<Set<string>>(new Set());

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  // Fetch rider profile and active job
  const refreshData = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      const [resProfile, resActive] = await Promise.all([
        fetch('/api/rider/profile', { headers: authHeaders() }),
        fetch('/api/rider/orders/active-job', { headers: authHeaders() }),
      ]);

      if (resProfile.ok) {
        const data = await resProfile.json();
        setProfile(data.profile);
        setIsOnline(Boolean(data.profile?.isOnline));
      }

      if (resActive.ok) {
        const activeData = await resActive.json();
        setActiveDelivery(activeData.activeDelivery || null);
        if (activeData.activeDelivery) {
          setIncomingBroadcast(null); // Clear broadcast alert if already on a job
        }
      }
    } catch (err) {
      console.error('Error refreshing rider data:', err);
    }
  }, [token, isAuthenticated, authHeaders]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Toggle Online / Offline status
  const toggleOnline = async () => {
    if (!token) return;
    try {
      const nextState = !isOnline;
      const res = await fetch('/api/rider/profile/status', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isOnline: nextState }),
      });
      if (res.ok) {
        setIsOnline(nextState);
        setProfile((prev) => prev ? { ...prev, isOnline: nextState } : null);
        if (!nextState) {
          setIncomingBroadcast(null);
        }
      }
    } catch (err) {
      console.error('Failed to toggle rider status:', err);
    }
  };

  // Update working radius
  const updateRadius = async (radiusKm: number) => {
    if (!token) return;
    try {
      const res = await fetch('/api/rider/profile', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ serviceRadiusKm: radiusKm }),
      });
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, serviceRadiusKm: radiusKm } : null);
      }
    } catch (err) {
      console.error('Failed to update radius:', err);
    }
  };

  const updatePartnerProfile = async (updateData: Partial<RiderProfileData>): Promise<boolean> => {
    if (!token) return false;
    try {
      const res = await fetch('/api/rider/profile', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        const json = await res.json();
        setProfile((prev) => prev ? { ...prev, ...(json.profile || updateData) } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update partner profile:', err);
      return false;
    }
  };

  // Manual GPS update using Mapbox Reverse Geocoding (no auto-polling)
  const updateGpsLocation = async (): Promise<{ success: boolean; address?: string; error?: string }> => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const geocoded = await detectCurrentLocationWithMapbox();
      const res = await fetch('/api/rider/profile', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          currentLat: geocoded.latitude,
          currentLng: geocoded.longitude,
          address: geocoded.fullAddress,
        }),
      });
      if (res.ok) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                currentLat: geocoded.latitude,
                currentLng: geocoded.longitude,
                address: geocoded.fullAddress,
              }
            : null
        );
        return { success: true, address: geocoded.fullAddress };
      }
      return { success: false, error: 'Failed to update location on server' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Location detection failed';
      return { success: false, error: msg };
    }
  };

  // Radar polling for incoming broadcast deliveries
  useEffect(() => {
    if (!isOnline || activeDelivery || !token) return;

    const pollBroadcasts = async () => {
      try {
        const res = await fetch('/api/rider/orders/broadcast-feed', { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const list: BroadcastDelivery[] = data.deliveries || [];
          const candidate = list.find((d) => !dismissedOrderIds.current.has(d.id));

          if (candidate) {
            setIncomingBroadcast((prev) => {
              if (prev?.id !== candidate.id) {
                playDispatchChime();
              }
              return candidate;
            });
          } else {
            setIncomingBroadcast(null);
          }
        }
      } catch (err) {
        console.error('Broadcast feed poll error:', err);
      }
    };

    pollBroadcasts();
    const interval = setInterval(pollBroadcasts, 6000);
    return () => clearInterval(interval);
  }, [isOnline, activeDelivery, token, authHeaders]);

  // Atomic claim
  const acceptOrder = async (deliveryId: string) => {
    if (!token) return { success: false, error: 'Unauthorized' };
    try {
      const res = await fetch(`/api/rider/orders/${deliveryId}/accept`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveDelivery(data.delivery);
        setIncomingBroadcast(null);
        return { success: true };
      } else {
        dismissedOrderIds.current.add(deliveryId);
        setIncomingBroadcast(null);
        return { success: false, error: data.message || 'Already claimed by another partner.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error claiming order.' };
    }
  };

  // Decline order
  const declineOrder = (deliveryId: string) => {
    dismissedOrderIds.current.add(deliveryId);
    setIncomingBroadcast(null);
  };

  // Advance delivery turn-by-turn stage
  const advanceStage = async (nextStage: 'arrived_pickup' | 'picked_up' | 'arrived_customer') => {
    if (!token || !activeDelivery) return;
    try {
      const res = await fetch(`/api/rider/orders/${activeDelivery.id}/stage`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ stage: nextStage }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveDelivery(data.delivery);
      }
    } catch (err) {
      console.error('Error advancing delivery stage:', err);
    }
  };

  // Complete delivery via OTP
  const completeDelivery = async (otp: string, photoProofUrl?: string) => {
    if (!token || !activeDelivery) return { success: false, error: 'No active delivery.' };
    try {
      const res = await fetch(`/api/rider/orders/${activeDelivery.id}/complete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ otp, proofPhotoUrl: photoProofUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveDelivery(null);
        await refreshData();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Invalid OTP code.' };
      }
    } catch (err) {
      return { success: false, error: 'Failed to verify completion.' };
    }
  };

  return (
    <RiderContext.Provider
      value={{
        profile,
        isOnline,
        toggleOnline,
        updateRadius,
        updatePartnerProfile,
        activeDelivery,
        incomingBroadcast,
        acceptOrder,
        declineOrder,
        advanceStage,
        completeDelivery,
        refreshData,
        updateGpsLocation,
        playChime: playDispatchChime,
      }}
    >
      {children}
    </RiderContext.Provider>
  );
};

export const useRider = () => {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error('useRider must be used within RiderProvider');
  return ctx;
};
