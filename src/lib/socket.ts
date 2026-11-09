import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const socketUrl = isLocal 
      ? 'http://localhost:5001' 
      : 'https://api.codetechawsurl1.shop';

    socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Real-time WebSocket gateway connected');
      // Re-join active panel room on reconnect
      try {
        const adminUser = localStorage.getItem('shopindia_admin_user');
        const regUser = localStorage.getItem('shopindia_regional_admin_user');
        const vendorUser = localStorage.getItem('shopindia_vendor_user');
        const riderUser = localStorage.getItem('shopindia_rider_user');
        const custUser = localStorage.getItem('shopindia_customer_user');

        if (adminUser) {
          const u = JSON.parse(adminUser);
          socketInstance?.emit('join_panel', { role: 'super_admin', userId: u.id });
        } else if (regUser) {
          const u = JSON.parse(regUser);
          socketInstance?.emit('join_panel', { role: 'regional_admin', userId: u.id, branchId: u.branchId });
        } else if (vendorUser) {
          const u = JSON.parse(vendorUser);
          socketInstance?.emit('join_panel', { role: 'vendor', userId: u.id, vendorId: u.vendorId || u.id });
        } else if (riderUser) {
          const u = JSON.parse(riderUser);
          socketInstance?.emit('join_panel', { role: 'rider', userId: u.id, riderProfileId: u.riderProfileId || u.id });
        } else if (custUser) {
          const u = JSON.parse(custUser);
          socketInstance?.emit('join_panel', { role: 'customer', userId: u.id });
        }
      } catch (_) {}
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Real-time socket warning (transports fallback):', err.message);
    });
  }

  return socketInstance;
}

export function joinPanelRooms(params: {
  role?: string;
  userId?: string;
  vendorId?: string;
  riderProfileId?: string;
  branchId?: string;
}) {
  const socket = getSocket();
  if (socket.connected) {
    socket.emit('join_panel', params);
  } else {
    socket.once('connect', () => {
      socket.emit('join_panel', params);
    });
  }
}

/**
 * Custom React hook for subscribing to a real-time WebSocket event.
 * Automatically cleans up listener on component unmount or dependency change.
 */
export function useSocketEvent<T = any>(
  eventName: string,
  handler: (data: T) => void,
  deps: React.DependencyList = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();

    const listener = (data: T) => {
      if (handlerRef.current) {
        handlerRef.current(data);
      }
    };

    socket.on(eventName, listener);

    return () => {
      socket.off(eventName, listener);
    };
  }, [eventName, ...deps]);
}
