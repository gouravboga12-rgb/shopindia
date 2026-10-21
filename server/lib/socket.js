const { Server } = require('socket.io');

let io = null;
const activeLocations = new Map(); // deliveryId -> { lat, lng, bearing, speed, updatedAt }
const lastDbSync = new Map(); // deliveryId -> timestamp

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:3000',
        'https://shopindia-three.vercel.app',
        'https://api.codetechawsurl1.shop',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // Join a specific delivery room (for Customer, Vendor, Rider)
    socket.on('join_delivery', ({ deliveryId }) => {
      if (!deliveryId) return;
      socket.join(`delivery:${deliveryId}`);

      // If we already have a cached location for this delivery, send it immediately
      if (activeLocations.has(deliveryId)) {
        socket.emit('delivery:location_update', activeLocations.get(deliveryId));
      }
    });

    // Leave a specific delivery room
    socket.on('leave_delivery', ({ deliveryId }) => {
      if (!deliveryId) return;
      socket.leave(`delivery:${deliveryId}`);
    });

    // High-frequency GPS ping from Rider
    // Throttled in-memory transmission — 0 DB overhead!
    socket.on('rider:location_ping', ({ deliveryId, lat, lng, bearing = 0, speed = 0, stage }) => {
      if (!deliveryId || !lat || !lng) return;

      const payload = {
        deliveryId,
        lat: Number(lat),
        lng: Number(lng),
        bearing: Number(bearing),
        speed: Number(speed),
        stage,
        updatedAt: new Date().toISOString(),
      };

      activeLocations.set(deliveryId, payload);

      // Instant real-time broadcast to Customer & Vendor in this delivery's room
      socket.to(`delivery:${deliveryId}`).emit('delivery:location_update', payload);

      // Throttled persistence (save coordinates to RiderProfile at most once every 30 seconds)
      const now = Date.now();
      const lastSync = lastDbSync.get(deliveryId) || 0;
      if (now - lastSync > 30000) {
        lastDbSync.set(deliveryId, now);
        // Async background write to keep RiderProfile updated without blocking socket
        try {
          const prisma = require('./prisma');
          prisma.delivery.findUnique({
            where: { id: deliveryId },
            select: { riderProfileId: true },
          }).then((del) => {
            if (del?.riderProfileId) {
              prisma.riderProfile.update({
                where: { id: del.riderProfileId },
                data: { currentLat: Number(lat), currentLng: Number(lng) },
              }).catch(() => {});
            }
          }).catch(() => {});
        } catch (_) {}
      }
    });

    socket.on('disconnect', () => {
      // Socket cleanly disconnected
    });
  });

  return io;
}

function getIo() {
  return io;
}

function getDeliveryLocation(deliveryId) {
  return activeLocations.get(deliveryId) || null;
}

function emitDeliveryStageChange(deliveryId, data) {
  if (io) {
    io.to(`delivery:${deliveryId}`).emit('delivery:stage_changed', data);
  }
}

function cleanDeliveryTracking(deliveryId) {
  activeLocations.delete(deliveryId);
  lastDbSync.delete(deliveryId);
}

module.exports = {
  initSocket,
  getIo,
  getDeliveryLocation,
  emitDeliveryStageChange,
  cleanDeliveryTracking,
};
