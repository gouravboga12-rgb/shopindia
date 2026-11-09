import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export interface VendorProfileData {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string;
  gstNumber?: string | null;
  panNumber?: string | null;
  approvalStatus?: string;
  walletBalance?: number;
  commissionRate?: number;
  lat?: number | null;
  lng?: number | null;
  deliveryRadiusKm?: number | null;
  supportsQuick?: boolean;
  logo?: string | null;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  isOnline: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface VendorContextType {
  vendor: VendorProfileData | null;
  isOnline: boolean;
  loading: boolean;
  toggling: boolean;
  toggleOnline: (targetState?: boolean) => Promise<boolean>;
  refreshVendor: () => Promise<void>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [vendor, setVendor] = useState<VendorProfileData | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [toggling, setToggling] = useState<boolean>(false);

  const refreshVendor = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    try {
      const res: any = await api.get('/api/vendor/settings');
      if (res?.success && res?.settings) {
        setVendor(res.settings);
        setIsOnline(res.settings.isOnline !== false);
      }
    } catch (err) {
      console.warn('[VendorContext] Failed to load vendor profile:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    refreshVendor();
  }, [refreshVendor]);

  const toggleOnline = async (targetState?: boolean): Promise<boolean> => {
    if (!token || toggling) return isOnline;
    setToggling(true);
    const nextState = targetState !== undefined ? targetState : !isOnline;

    // Optimistic UI update
    setIsOnline(nextState);
    if (vendor) {
      setVendor({ ...vendor, isOnline: nextState });
    }

    try {
      const res: any = await api.patch('/api/vendor/settings/status', { isOnline: nextState });
      if (res?.success) {
        setIsOnline(Boolean(res.isOnline));
        if (vendor) setVendor(prev => prev ? { ...prev, isOnline: res.isOnline } : null);
        return res.isOnline;
      } else {
        // Rollback if failure
        setIsOnline(!nextState);
        if (vendor) setVendor(prev => prev ? { ...prev, isOnline: !nextState } : null);
        return !nextState;
      }
    } catch (err) {
      console.error('[VendorContext] Toggle online status failed:', err);
      // Rollback
      setIsOnline(!nextState);
      if (vendor) setVendor(prev => prev ? { ...prev, isOnline: !nextState } : null);
      return !nextState;
    } finally {
      setToggling(false);
    }
  };

  return (
    <VendorContext.Provider
      value={{
        vendor,
        isOnline,
        loading,
        toggling,
        toggleOnline,
        refreshVendor,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = (): VendorContextType => {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error('useVendor must be used within a VendorProvider');
  }
  return context;
};

