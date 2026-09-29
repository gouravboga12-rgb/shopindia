import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import type {
  Address, PaymentMethod, Transaction, Reward, DashboardNotification,
  Review, Coupon, ActivityRecord, CustomerProfile,
} from '../data/dashboardTypes';
import { api } from '../lib/api';
import { getCustomerToken, clearCustomerSession, getCustomerUser } from '../lib/customerAuth';

const now = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86400000).toISOString();

// We'll keep usePersistent for now for things that don't have a backend endpoint yet,
// but we will gradually replace these with API calls.
function usePersistent<T>(_key: string, fallback: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(fallback); // Removed localStorage store/load to prevent UI flicker before API loads
  return [state, setState];
}

const seedAddresses = (): Address[] => [];

const seedPayments = (): { methods: PaymentMethod[]; transactions: Transaction[] } => ({
  methods: [],
  transactions: [],
});

const seedRewards = (): Reward[] => [];

const seedNotifications = (): DashboardNotification[] => [];

const seedReviews = (): Review[] => [];

const seedCoupons = (): Coupon[] => [];

export interface CustomerValue {
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  rewards: Reward[];
  points: number;
  notifications: DashboardNotification[];
  unread: number;
  reviews: Review[];
  coupons: Coupon[];
  wishlist: string[];
  savedForLater: string[];
  recentlyViewed: string[];
  profile: CustomerProfile;
  activities: ActivityRecord[];
  activityByDay: { date: string; count: number }[];
  events: { event: string; count: number }[];
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;

  addAddress(a: Omit<Address, 'id'>): Promise<void>;
  updateAddress(a: Address): Promise<void>;
  removeAddress(id: string): Promise<void>;
  setDefaultAddress(id: string): Promise<void>;

  addPaymentMethod(m: Omit<PaymentMethod, 'id' | 'label'> & { label?: string }): Promise<void>;
  removePaymentMethod(id: string): Promise<void>;
  setDefaultPaymentMethod(id: string): Promise<void>;

  markNotificationRead(id: string): void;
  markAllNotificationsRead(): void;
  removeNotification(id: string): void;
  addNotification(n: Omit<DashboardNotification, 'id' | 'isRead' | 'createdAt'>): void;

  addReview(r: Omit<Review, 'id' | 'createdAt'>): Promise<void>;
  updateReview(r: Review): Promise<void>;
  removeReview(id: string): Promise<void>;

  toggleWishlist(productId: string): Promise<void>;
  moveToWishlist(productId: string): void;
  saveForLater(productId: string): void;
  moveToCart(productId: string): void;
  removeSaved(productId: string): void;
  recordView(productId: string): void;
  clearRecentlyViewed(): void;

  updateProfile(p: Partial<CustomerProfile>): Promise<void>;
  logActivity(event: string, payload?: { entityId?: string; entityType?: string; metadata?: string }): void;
}

const CustomerContext = createContext<CustomerValue | undefined>(undefined);

export const useCustomer = () => {
  const c = useContext(CustomerContext);
  if (!c) throw new Error('useCustomer must be used within CustomerProvider');
  return c;
};

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [addresses, setAddresses] = useState<Address[]>(seedAddresses());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(seedPayments().methods);
  const [transactions] = usePersistent<Transaction[]>('transactions', seedPayments().transactions);
  const [rewards] = usePersistent<Reward[]>('rewards', seedRewards());
  const [notifications, setNotifications] = useState<DashboardNotification[]>(() => {
    try {
      const saved = localStorage.getItem('shopindia_customer_notifications');
      return saved ? JSON.parse(saved) : seedNotifications();
    } catch {
      return seedNotifications();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('shopindia_customer_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);
  const [reviews, setReviews] = useState<Review[]>(seedReviews());
  const [coupons] = usePersistent<Coupon[]>('coupons', seedCoupons());
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shopindia_customer_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('shopindia_customer_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);
  const [savedForLater, setSavedForLater] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [profile, setProfile] = useState<CustomerProfile>(() => {
    const localUser = getCustomerUser();
    if (localUser && getCustomerToken()) {
      return { 
        name: localUser.name || 'Guest User', 
        email: localUser.email || 'guest@shopindia.com', 
        phone: '+91 98765 43210', 
        plusMember: true 
      };
    }
    return { name: 'Guest User', email: 'guest@shopindia.com', phone: '+91 98765 43210', plusMember: true };
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      const token = getCustomerToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const [addrRes, payRes, wishRes, notifRes, profRes, revRes] = await Promise.allSettled([
          api.get<{ addresses: Address[] }>('/api/customer/addresses').catch(() => null),
          api.get<{ payments: PaymentMethod[] }>('/api/customer/payments').catch(() => null),
          api.get<{ wishlist: string[] }>('/api/customer/wishlist').catch(() => null),
          api.get<{ notifications: DashboardNotification[] }>('/api/customer/notifications').catch(() => null),
          api.get<{ profile: CustomerProfile }>('/api/customer/profile').catch(() => null),
          api.get<{ reviews: Review[] }>('/api/customer/reviews').catch(() => null)
        ]);

        if (addrRes.status === 'fulfilled' && addrRes.value?.addresses) setAddresses(addrRes.value.addresses);
        if (payRes.status === 'fulfilled' && payRes.value?.payments) setPaymentMethods(payRes.value.payments);
        if (wishRes.status === 'fulfilled' && wishRes.value?.wishlist) {
          setWishlist(prev => Array.from(new Set([...prev, ...(wishRes.value?.wishlist || [])])));
        }
        if (notifRes.status === 'fulfilled' && notifRes.value?.notifications) setNotifications(notifRes.value.notifications);
        if (profRes.status === 'fulfilled' && profRes.value?.profile) setProfile(profRes.value.profile);
        if (revRes.status === 'fulfilled' && revRes.value?.reviews) setReviews(revRes.value.reviews);
      } catch (err) {
        console.error('Failed to fetch customer data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomerData();
  }, []);

  const points = (rewards || []).reduce((s, r) => s + (r.points || 0), 0);
  const unread = (notifications || []).filter((n) => !n.isRead).length;

  const logActivity = useCallback((event: string, payload?: { entityId?: string; entityType?: string; metadata?: string }) => {
    setActivities((prev) => [
      { id: 'ac' + Date.now(), event, entityId: payload?.entityId, entityType: payload?.entityType, metadata: payload?.metadata, createdAt: now() },
      ...prev,
    ].slice(0, 200));
  }, []);

  // ── Addresses ──
  const addAddress = useCallback(async (a: Omit<Address, 'id'>) => {
    try {
      const res = await api.post<{ address: Address }>('/api/customer/addresses', a);
      const newAddress = res.address || { ...a, id: 'a' + Date.now(), isDefault: a.isDefault || addresses.length === 0 };
      
      setAddresses((prev) => {
        const isDefault = newAddress.isDefault || prev.length === 0;
        const base = isDefault ? prev.map((x) => ({ ...x, isDefault: false })) : prev;
        return [...base, newAddress];
      });
      logActivity('ADDRESS_ADDED', { entityType: 'address' });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [addresses.length, logActivity]);

  const updateAddress = useCallback(async (a: Address) => {
    try {
      await api.put<{ address: Address }>(`/api/customer/addresses/${a.id}`, a);
      setAddresses((prev) => {
        let base = prev.map((x) => (x.id === a.id ? { ...a } : x));
        if (a.isDefault) base = base.map((x) => (x.id === a.id ? x : { ...x, isDefault: false }));
        return base;
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const removeAddress = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/customer/addresses/${id}`);
      setAddresses((prev) => {
        const wasDefault = prev.find((a) => a.id === id)?.isDefault;
        const rest = prev.filter((a) => a.id !== id);
        if (wasDefault && rest.length) rest[0].isDefault = true;
        return rest;
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const setDefaultAddress = useCallback(async (id: string) => {
    try {
      await api.put(`/api/customer/addresses/${id}/default`, {});
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  // ── Payments ──
  const addPaymentMethod = useCallback(async (m: Omit<PaymentMethod, 'id' | 'label'> & { label?: string }) => {
    try {
      const res = await api.post<{ paymentMethod: PaymentMethod }>('/api/customer/payments', m);
      
      setPaymentMethods((prev) => {
        const isDefault = m.isDefault || prev.length === 0;
        const base = isDefault ? prev.map((x) => ({ ...x, isDefault: false })) : prev;
        let label = m.label;
        if (!label) {
          label = m.type === 'UPI' ? 'UPI'
            : (m.type === 'CREDIT_CARD' || m.type === 'DEBIT_CARD') && m.last4 ? `Card •••• ${m.last4}`
            : m.type === 'NET_BANKING' && m.bankName ? m.bankName : m.type;
        }
        
        const newPayment = res.paymentMethod || { ...m, id: 'pm' + Date.now(), label, isDefault };
        return [...base, newPayment];
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const removePaymentMethod = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/customer/payments/${id}`);
      setPaymentMethods((prev) => {
        const wasDefault = prev.find((m) => m.id === id)?.isDefault;
        const rest = prev.filter((m) => m.id !== id);
        if (wasDefault && rest.length) rest[0].isDefault = true;
        return rest;
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const setDefaultPaymentMethod = useCallback(async (id: string) => {
    try {
      await api.put(`/api/customer/payments/${id}/default`, {});
      setPaymentMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  // ── Notifications ──
  const markNotificationRead = useCallback((id: string) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))), []);
  const markAllNotificationsRead = useCallback(() => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true }))), []);
  const removeNotification = useCallback((id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id)), []);
  const addNotification = useCallback((n: Omit<DashboardNotification, 'id' | 'isRead' | 'createdAt'>) => {
    setNotifications((prev) => [{ ...n, id: 'n' + Date.now(), isRead: false, createdAt: now() }, ...prev].slice(0, 100));
  }, []);

  // ── Reviews ──
  const addReview = useCallback(async (r: Omit<Review, 'id' | 'createdAt'>) => {
    const optimistic: Review = {
      ...r,
      id: 'rv_' + Date.now(),
      createdAt: now()
    };

    setReviews((prev) => {
      const existing = prev.find((x) => x.productId === r.productId);
      if (existing) {
        return prev.map((x) => (x.id === existing.id ? { ...existing, ...r } : x));
      }
      return [optimistic, ...prev];
    });

    logActivity('REVIEW_SUBMITTED', { entityId: r.productId, entityType: 'product' });

    try {
      const res = await api.post<{ review: Review }>('/api/customer/reviews', r);
      if (res.review) {
        setReviews((prev) => prev.map((x) => (x.id === optimistic.id ? res.review : x)));
      }
    } catch (err) {
      console.warn('Backend review sync notice:', err);
    }
  }, [logActivity]);

  const updateReview = useCallback(async (r: Review) => {
    try {
      await api.put(`/api/customer/reviews/${r.id}`, r);
      setReviews((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  const removeReview = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/customer/reviews/${id}`);
      setReviews((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  // ── Wishlist / Saved / Recently viewed ──
  const toggleWishlist = useCallback(async (productId: string) => {
    setWishlist((prev) => {
      const has = prev.includes(productId);
      const next = has ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem('shopindia_customer_wishlist', JSON.stringify(next));
      } catch {}
      logActivity(has ? 'REMOVED_FROM_WISHLIST' : 'ADDED_TO_WISHLIST', { entityId: productId, entityType: 'product' });
      return next;
    });

    try {
      await api.post('/api/customer/wishlist/toggle', { productId }).catch(() => {});
    } catch {
      // Backend sync error caught to maintain resilient offline/guest capability
    }
  }, [logActivity]);

  const moveToWishlist = useCallback((productId: string) => {
    setWishlist((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setSavedForLater((prev) => prev.filter((id) => id !== productId));
  }, []);

  const saveForLater = useCallback((productId: string) => {
    setSavedForLater((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
  }, []);
  const moveToCart = useCallback((productId: string) => setSavedForLater((prev) => prev.filter((id) => id !== productId)), []);
  const removeSaved = useCallback((productId: string) => setSavedForLater((prev) => prev.filter((id) => id !== productId)), []);

  const recordView = useCallback((productId: string) => {
    setRecentlyViewed((prev) => [productId, ...prev.filter((id) => id !== productId)].slice(0, 12));
    logActivity('PRODUCT_VIEWED', { entityId: productId, entityType: 'product' });
  }, [logActivity]);
  const clearRecentlyViewed = useCallback(() => setRecentlyViewed([]), []);

  const updateProfile = useCallback(async (p: Partial<CustomerProfile>) => {
    try {
      await api.put('/api/customer/profile', p);
      setProfile((prev) => ({ ...prev, ...p }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  // derived analytics
  const activityByDay = (() => {
    const map: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) map[now(i).slice(0, 10)] = 0;
    activities.forEach((a) => { const k = a.createdAt.slice(0, 10); if (k in map) map[k] += 1; });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  })();

  const eventCounts = activities.reduce<Record<string, number>>((m, a) => ((m[a.event] = (m[a.event] || 0) + 1), m), {});
  const events = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).map(([event, count]) => ({ event, count }));

  const value: CustomerValue = {
    addresses, paymentMethods, transactions, rewards, points, notifications, unread, reviews, coupons,
    wishlist, savedForLater, recentlyViewed, profile, activities, activityByDay, events, isLoading,
    addAddress, updateAddress, removeAddress, setDefaultAddress,
    addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod,
    markNotificationRead, markAllNotificationsRead, removeNotification, addNotification,
    addReview, updateReview, removeReview,
    toggleWishlist, moveToWishlist, saveForLater, moveToCart, removeSaved, recordView, clearRecentlyViewed, updateProfile, logActivity,
    isAuthenticated: !!getCustomerToken(),
    logout: () => {
      clearCustomerSession();
      window.location.reload();
    }
  };

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
};
