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
    // 1. Join panel-specific room on login / session start
    socket.on('join_panel', ({ role, userId, vendorId, riderProfileId, branchId }) => {
      if (role === 'super_admin') {
        socket.join('panel:admin');
      }
      if (role === 'regional_admin') {
        socket.join('panel:regional');
        if (branchId) socket.join(`panel:regional:${branchId}`);
      }
      if (vendorId) {
        socket.join(`panel:vendor:${vendorId}`);
      }
      if (riderProfileId) {
        socket.join(`panel:rider:${riderProfileId}`);
        socket.join('panel:rider:radar');
      }
      if (userId) {
        socket.join(`panel:customer:${userId}`);
      }
    });

    // 2. Delivery live tracking room
    socket.on('join_delivery', ({ deliveryId }) => {
      if (!deliveryId) return;
      socket.join(`delivery:${deliveryId}`);

      if (activeLocations.has(deliveryId)) {
        socket.emit('delivery:location_update', activeLocations.get(deliveryId));
      }
    });

    socket.on('leave_delivery', ({ deliveryId }) => {
      if (!deliveryId) return;
      socket.leave(`delivery:${deliveryId}`);
    });

    // 3. High-frequency GPS ping from Rider (zero DB write overhead)
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
      socket.to(`delivery:${deliveryId}`).emit('delivery:location_update', payload);

      const now = Date.now();
      const lastSync = lastDbSync.get(deliveryId) || 0;
      if (now - lastSync > 30000) {
        lastDbSync.set(deliveryId, now);
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
      // Clean disconnect
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

// ==========================================
// HIGH-LEVEL REAL-TIME BROADCASTERS
// ==========================================

function notifyNewOrder(order) {
  if (!io) return;
  // Admin
  io.to('panel:admin').emit('order:created', order);

  // Regional
  if (order.branchId) {
    io.to(`panel:regional:${order.branchId}`).emit('order:created', order);
  }
  io.to('panel:regional').emit('order:created', order);

  // Vendor
  if (order.vendorId) {
    io.to(`panel:vendor:${order.vendorId}`).emit('order:created', order);
  }

  // Rider Radar (Quick commerce & HVAC service dispatches)
  if (order.type === 'quick_commerce' || order.type === 'hvac_service') {
    io.to('panel:rider:radar').emit('radar:new_dispatch', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      total: order.total,
      deliveryPincode: order.deliveryPincode,
    });
  }
}

function notifyOrderStatus(orderId, status, meta = {}) {
  if (!io) return;
  const payload = { orderId, status, ...meta, timestamp: new Date().toISOString() };

  io.to('panel:admin').emit('order:status_changed', payload);
  if (meta.branchId) io.to(`panel:regional:${meta.branchId}`).emit('order:status_changed', payload);
  if (meta.vendorId) io.to(`panel:vendor:${meta.vendorId}`).emit('order:status_changed', payload);
  if (meta.customerId) io.to(`panel:customer:${meta.customerId}`).emit('order:status_changed', payload);
  if (meta.riderProfileId) io.to(`panel:rider:${meta.riderProfileId}`).emit('order:status_changed', payload);

  // Also emit to the specific delivery room if tracked live
  if (meta.deliveryId) {
    io.to(`delivery:${meta.deliveryId}`).emit('delivery:stage_changed', payload);
  }
}

function notifyPayoutRequest(payout) {
  if (!io) return;
  io.to('panel:admin').emit('payout:created', payout);
  io.to('panel:regional').emit('payout:created', payout);
  if (payout.branchId) io.to(`panel:regional:${payout.branchId}`).emit('payout:created', payout);
}

function notifyPayoutStatus(payout) {
  if (!io) return;
  io.to('panel:admin').emit('payout:updated', payout);
  io.to('panel:regional').emit('payout:updated', payout);
  if (payout.branchId) io.to(`panel:regional:${payout.branchId}`).emit('payout:updated', payout);

  if (payout.vendorId) {
    io.to(`panel:vendor:${payout.vendorId}`).emit('payout:updated', payout);
  }
  if (payout.riderProfileId) {
    io.to(`panel:rider:${payout.riderProfileId}`).emit('payout:updated', payout);
  }
}

function notifyWalletUpdate(partyType, partyId, balance, extra = {}) {
  if (!io) return;
  const payload = { partyType, partyId, balance, ...extra, timestamp: new Date().toISOString() };
  if (partyType === 'VENDOR') {
    io.to(`panel:vendor:${partyId}`).emit('wallet:updated', payload);
  } else if (partyType === 'RIDER') {
    io.to(`panel:rider:${partyId}`).emit('wallet:updated', payload);
  }
}

function notifyVendorStatus(vendorId, data = {}) {
  if (!io) return;
  const payload = { vendorId, ...data, timestamp: new Date().toISOString() };
  io.to('panel:admin').emit('vendor:status_changed', payload);
  io.to('panel:regional').emit('vendor:status_changed', payload);
  io.emit('vendor:public_status', payload);
}

function notifyTicketUpdate(ticketId, data = {}) {
  if (!io) return;
  const payload = { ticketId, ...data, timestamp: new Date().toISOString() };
  io.emit('ticket:updated', payload);
}

module.exports = {
  initSocket,
  getIo,
  getDeliveryLocation,
  emitDeliveryStageChange,
  cleanDeliveryTracking,
  notifyNewOrder,
  notifyOrderStatus,
  notifyPayoutRequest,
  notifyPayoutStatus,
  notifyWalletUpdate,
  notifyVendorStatus,
  notifyTicketUpdate,
};
