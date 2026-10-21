const express = require('express');
const prisma = require('../lib/prisma');
const { getDeliveryLocation } = require('../lib/socket');

const router = express.Router();

/**
 * GET /api/tracking/order/:orderId
 * Fetches real-time delivery status, route coordinates, and assigned rider for a customer/vendor order
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            type: true,
            total: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                phone: true,
                street: true,
                city: true,
                state: true,
                pincode: true,
              },
            },
          },
        },
        riderProfile: {
          select: {
            id: true,
            vehicleType: true,
            vehicleNumber: true,
            rating: true,
            currentLat: true,
            currentLng: true,
            user: {
              select: {
                name: true,
                phone: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      return res.status(404).json({ error: 'No quick delivery record found for this order.' });
    }

    // Get live in-memory location ping if actively streaming, or fallback to rider profile coords
    const livePing = getDeliveryLocation(delivery.id);
    const lastLat = livePing?.lat ?? delivery.riderProfile?.currentLat ?? delivery.pickupLat ?? 17.4486;
    const lastLng = livePing?.lng ?? delivery.riderProfile?.currentLng ?? delivery.pickupLng ?? 78.3850;

    res.json({
      success: true,
      deliveryId: delivery.id,
      orderId: delivery.orderId,
      orderNumber: delivery.order?.orderNumber,
      status: delivery.status,
      distanceKm: delivery.distanceKm,
      deliveryOtp: delivery.deliveryOtp, // Shown to customer for verification
      pickup: {
        name: delivery.pickupName,
        address: delivery.pickupAddress,
        phone: delivery.pickupPhone,
        lat: delivery.pickupLat || 17.4486,
        lng: delivery.pickupLng || 78.3850,
      },
      dropoff: {
        name: delivery.dropoffName,
        address: delivery.dropoffAddress,
        phone: delivery.dropoffPhone,
        lat: delivery.dropoffLat || 17.4375,
        lng: delivery.dropoffLng || 78.3650,
      },
      rider: delivery.riderProfile ? {
        id: delivery.riderProfile.id,
        name: delivery.riderProfile.user?.name || 'Assigned Partner',
        phone: delivery.riderProfile.user?.phone || '',
        avatar: delivery.riderProfile.user?.avatar,
        vehicleType: delivery.riderProfile.vehicleType,
        vehicleNumber: delivery.riderProfile.vehicleNumber,
        rating: delivery.riderProfile.rating || 5.0,
      } : null,
      currentLocation: {
        lat: lastLat,
        lng: lastLng,
        bearing: livePing?.bearing || 0,
        speed: livePing?.speed || 0,
        updatedAt: livePing?.updatedAt || new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Order tracking fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
