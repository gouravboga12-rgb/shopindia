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
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected successfully to live tracking gateway');
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket connection warning (falling back to polling):', err.message);
    });
  }

  return socketInstance;
}
