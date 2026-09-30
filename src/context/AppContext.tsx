import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product } from '../data/types';

const RAW_API = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API.replace(/\/api\/?$/, '').replace(/\/$/, '');
import { api } from '../lib/api';
import { getCustomerToken } from '../lib/customerAuth';

export type VerticalType = 'shop' | 'quick' | 'services';
export type PathType = 'home' | 'search' | 'detail' | 'cart' | 'orders' | 'profile' | 'dashboard' | 'notifications' | 'category';

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber?: string;
  date: string;
  items: OrderItem[];
  total: number;
  vertical: VerticalType;
  status: 'placed' | 'confirmed' | 'packing' | 'shipping' | 'delivered' | 'cancelled';
  deliveryTimeEstimate: string;
  location: string;
}

export type NotificationType = 'order' | 'quick' | 'service' | 'promo';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionText?: string;
  icon: any;
  color: string;
  bg: string;
}

interface AppContextType {
  currentVertical: VerticalType;
  setCurrentVertical: (vertical: VerticalType) => void;
  currentPath: PathType;
  navigateTo: (path: PathType, productId?: string) => void;
  goBack: () => void;
  history: PathType[];
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  location: string;
  setLocation: (loc: string) => void;
  cart: OrderItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  orders: Order[];
  placeOrder: (payload: { addressId: string; paymentMethodId: string; items: any[]; total: number }) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  lastAddedProduct: { product: Product; timestamp: number } | null;
  clearLastAddedProduct: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Resolve route and vertical from clean path (and auto-clean legacy hashes)
  const initialRoute = React.useMemo(() => {
    if (window.location.hash.startsWith('#/')) {
      const clean = window.location.hash.slice(1);
      window.history.replaceState(null, '', clean);
    }
    const searchParams = new URLSearchParams(window.location.search);
    const urlProductId = searchParams.get('productId') || searchParams.get('id');
    const p = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    if (p.startsWith('/detail') || urlProductId) return { path: 'detail' as PathType, vertical: 'shop' as VerticalType, productId: urlProductId };
    if (p === '/dashboard' || p === '/account') return { path: 'dashboard' as PathType, vertical: 'shop' as VerticalType };
    if (p === '/profile') return { path: 'profile' as PathType, vertical: 'shop' as VerticalType };
    if (p === '/orders') return { path: 'orders' as PathType, vertical: 'shop' as VerticalType };
    if (p === '/cart') return { path: 'cart' as PathType, vertical: 'shop' as VerticalType };
    if (p === '/search') return { path: 'search' as PathType, vertical: 'shop' as VerticalType };
    if (p === '/category' || p === '/categories') return { path: 'category' as PathType, vertical: 'shop' as VerticalType };
    if (p === '/notifications') return { path: 'notifications' as PathType, vertical: 'shop' as VerticalType };
    if (p === '/quick') return { path: 'home' as PathType, vertical: 'quick' as VerticalType };
    if (p === '/services' || p === '/glacons') return { path: 'home' as PathType, vertical: 'services' as VerticalType };
    return { path: 'home' as PathType, vertical: 'shop' as VerticalType };
  }, []);

  // Navigation states
  const [currentPath, setCurrentPath] = useState<PathType>(initialRoute.path);
  const [history, setHistory] = useState<PathType[]>([initialRoute.path]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialRoute.productId || null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Business vertical
  const [currentVertical, setCurrentVerticalState] = useState<VerticalType>(initialRoute.vertical);

  // Location
  const [location, setLocationState] = useState<string>(() => {
    return localStorage.getItem('shopindia_user_location') || 'Bengaluru, Karnataka';
  });

  const setLocation = (loc: string) => {
    setLocationState(loc);
    localStorage.setItem('shopindia_user_location', loc);
  };

  // Cart
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [lastAddedProduct, setLastAddedProduct] = useState<{ product: Product; timestamp: number } | null>(null);

  const clearLastAddedProduct = useCallback(() => {
    setLastAddedProduct(null);
  }, []);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);

  // Notifications with persistent LocalStorage + Server Sync
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const saved = localStorage.getItem('shopindia_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('shopindia_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications to localStorage', e);
    }
  }, [notifications]);

  const addNotification = (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => {
    const newNotif: Notification = {
      ...n,
      id: Math.random().toString(36).substring(7),
      read: false,
      timestamp: 'Just now'
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      try {
        localStorage.setItem('shopindia_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      try {
        localStorage.setItem('shopindia_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem('shopindia_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Fetch initial data from API
  useEffect(() => {
    const fetchAppData = async () => {
      const token = getCustomerToken();
      if (!token) return;
      try {
        const [cartRes, ordersRes, notifsRes] = await Promise.allSettled([
          api.get<{ items: any[] }>('/api/customer/cart').catch(() => null),
          api.get<{ orders: Order[] }>('/api/orders').catch(() => null),
          api.get<any>('/api/customer/notifications').catch(() => null)
        ]);

        if (cartRes.status === 'fulfilled' && cartRes.value?.items) setCart(cartRes.value.items);
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.orders) setOrders(ordersRes.value.orders);
        if (notifsRes.status === 'fulfilled' && notifsRes.value?.notifications && Array.isArray(notifsRes.value.notifications) && notifsRes.value.notifications.length > 0) {
          setNotifications(prev => {
            const serverNotifs = notifsRes.value.notifications.map((sn: any) => ({
              id: sn.id || Math.random().toString(),
              type: sn.type || 'order',
              title: sn.title,
              message: sn.message,
              read: sn.isRead || false,
              timestamp: sn.createdAt ? new Date(sn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              actionText: 'View Order',
              icon: sn.type === 'quick' ? 'Zap' : sn.type === 'service' ? 'Wrench' : 'Package',
              color: 'text-blue-600',
              bg: 'bg-blue-50'
            }));
            const ids = new Set(prev.map(p => p.id));
            const fresh = serverNotifs.filter((s: any) => !ids.has(s.id));
            const combined = [...fresh, ...prev];
            try {
              localStorage.setItem('shopindia_notifications', JSON.stringify(combined));
            } catch {}
            return combined;
          });
        }
      } catch (err) {
        console.error('Failed to fetch App data', err);
      }
    };
    fetchAppData();
    
    const handleLocationChange = () => {
      if (window.location.hash.startsWith('#/')) {
        const clean = window.location.hash.slice(1);
        window.history.replaceState(null, '', clean);
      }
      const searchParams = new URLSearchParams(window.location.search);
      const urlProductId = searchParams.get('productId') || searchParams.get('id');
      const p = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      if (p.startsWith('/detail') || urlProductId) {
        if (urlProductId) setSelectedProductId(urlProductId);
        setCurrentPath('detail');
      } else if (p === '/dashboard' || p === '/account') setCurrentPath('dashboard');
      else if (p === '/profile') setCurrentPath('profile');
      else if (p === '/orders') setCurrentPath('orders');
      else if (p === '/cart') setCurrentPath('cart');
      else if (p === '/search') setCurrentPath('search');
      else if (p === '/category' || p === '/categories') setCurrentPath('category');
      else if (p === '/notifications') setCurrentPath('notifications');
      else if (p === '/quick') {
        setCurrentPath('home');
        setCurrentVerticalState('quick');
      } else if (p === '/services' || p === '/glacons') {
        setCurrentPath('home');
        setCurrentVerticalState('services');
      } else if (p === '/shop' || p === '/') {
        setCurrentPath('home');
        setCurrentVerticalState('shop');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('shopindia:navigate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('shopindia:navigate', handleLocationChange);
    };
  }, []);

  // Custom Navigation function
  const navigateTo = (path: PathType, productId?: string) => {
    if (productId) {
      setSelectedProductId(productId);
    }
    setHistory(prev => [...prev, path]);
    setCurrentPath(path);

    // Scroll window and document to the top immediately
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (path !== 'detail') {
      const targetUrl = path === 'home'
        ? (currentVertical === 'shop' ? '/' : `/${currentVertical}`)
        : `/${path}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
        window.dispatchEvent(new Event('shopindia:navigate'));
      }
    }
  };

  const goBack = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current path
      const prevPath = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentPath(prevPath);
      const targetUrl = prevPath === 'home' ? '/' : `/${prevPath}`;
      window.history.pushState(null, '', targetUrl);
      window.dispatchEvent(new Event('shopindia:navigate'));
    } else {
      setCurrentPath('home');
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new Event('shopindia:navigate'));
    }
  };

  const setCurrentVertical = (vertical: VerticalType) => {
    setCurrentVerticalState(vertical);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // When changing verticals on mobile/desktop, go back to home to display the correct feed
    setCurrentPath('home');
    const targetUrl = vertical === 'shop' ? '/' : `/${vertical}`;
    window.history.pushState(null, '', targetUrl);
    window.dispatchEvent(new Event('shopindia:navigate'));
  };

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.isOutOfStock || (product.stock !== undefined && product.stock <= 0)) {
      alert('This product is out of stock.');
      return;
    }
    setLastAddedProduct({ product, timestamp: Date.now() });
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  // Order placement (persists to the backend API)
  const placeOrder = async (payload: { addressId: string; paymentMethodId: string; items: any[]; total: number; vertical?: VerticalType }) => {
    try {
      await api.post('/api/orders', { ...payload, vertical: payload.vertical || currentVertical });
        // Fetch orders again to get the new order
        const res = await api.get<{ orders: Order[] }>('/api/orders');
        if (res.orders) setOrders(res.orders);
        
        // Add a live notification for the placed order
        const isQuick = currentVertical === 'quick';
        const isService = currentVertical === 'services';
        
        // Use lucide-react icons dynamically or pass string names. 
        // For simplicity, we just use string names that Notifications.tsx can map, or pass any generic object.
        // But since we are inside AppContext we can't easily import icons here without adding them to AppContext.
        addNotification({
          type: isQuick ? 'quick' : isService ? 'service' : 'order',
          title: isQuick ? 'Arriving in 10 mins! ⚡' : isService ? 'Service Booked 🛠️' : 'Order Placed! 🎉',
          message: isQuick 
            ? 'Your 10 Min delivery order has been placed and is being packed.' 
            : isService 
            ? 'Your service appointment has been successfully booked.' 
            : 'Your order has been placed! Expected delivery in 2-4 business days via express courier.',
          actionText: 'Track Order',
          icon: isQuick ? 'Zap' : isService ? 'Wrench' : 'Package',
          color: isQuick ? 'text-[#E5B500]' : isService ? 'text-amber-600' : 'text-blue-600',
          bg: isQuick ? 'bg-[#FFDF00]/20' : isService ? 'bg-amber-50' : 'bg-blue-50'
        });

        clearCart();
        navigateTo('orders');
    } catch (err) {
      console.error('Failed to place order', err);
      throw err;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const token = getCustomerToken();
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Cancel failed');
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const token = getCustomerToken();
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Update failed');
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as any } : o));
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentVertical,
        setCurrentVertical,
        currentPath,
        navigateTo,
        goBack,
        history,
        selectedProductId,
        setSelectedProductId,
        searchQuery,
        setSearchQuery,
        location,
        setLocation,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        orders,
        placeOrder,
        cancelOrder,
        updateOrderStatus,
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        lastAddedProduct,
        clearLastAddedProduct
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

