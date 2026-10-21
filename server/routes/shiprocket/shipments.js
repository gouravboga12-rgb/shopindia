const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { createShiprocketOrder, trackAwb } = require('../../lib/shiprocket');

const router = express.Router();

/**
 * POST /api/shiprocket/create-shipment
 * Initiated by vendor or admin to book 3PL shipping for a traditional order
 */
router.post('/create-shipment', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        vendor: true,
        shiprocketShipment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.shiprocketShipment?.awbCode) {
      return res.json({
        success: true,
        message: 'Shipment already booked.',
        shipment: order.shiprocketShipment,
      });
    }

    // Call Shiprocket integration
    const shiprocketResult = await createShiprocketOrder({
      order,
      vendor: order.vendor,
    });

    // Save or update ShiprocketShipment in DB
    const shipment = await prisma.shiprocketShipment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        vendorId: order.vendorId,
        shipmentId: shiprocketResult.shipmentId,
        shiprocketOrderId: shiprocketResult.shiprocketOrderId,
        awbCode: shiprocketResult.awbCode,
        courierName: shiprocketResult.courierName,
        labelUrl: shiprocketResult.labelUrl,
        manifestUrl: shiprocketResult.manifestUrl,
        trackingUrl: shiprocketResult.trackingUrl,
        currentStatus: shiprocketResult.currentStatus || 'AWB_ASSIGNED',
        pickupScheduledDate: new Date(),
      },
      update: {
        awbCode: shiprocketResult.awbCode,
        courierName: shiprocketResult.courierName,
        labelUrl: shiprocketResult.labelUrl,
        currentStatus: shiprocketResult.currentStatus || 'AWB_ASSIGNED',
      },
    });

    // Update order status to shipped / packing
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'shipped' },
    });

    res.status(201).json({
      success: true,
      message: `Shipment booked successfully with ${shiprocketResult.courierName}! AWB: ${shiprocketResult.awbCode}`,
      shipment,
    });
  } catch (err) {
    console.error('Create Shiprocket shipment error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/shiprocket/track/:awb
 * Live courier tracking timeline
 */
router.get('/track/:awb', async (req, res) => {
  try {
    const { awb } = req.params;
    const trackingData = await trackAwb(awb);
    res.json({ tracking: trackingData });
  } catch (err) {
    console.error('Shiprocket track error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/shiprocket/webhook
 * Receives live tracking webhooks from Shiprocket
 */
router.post('/webhook', async (req, res) => {
  try {
    const { awb, current_status, courier_name } = req.body;
    if (awb) {
      await prisma.shiprocketShipment.updateMany({
        where: { awbCode: awb },
        data: {
          currentStatus: current_status,
          courierName: courier_name,
        },
      });

      if (current_status === 'DELIVERED') {
        const shipment = await prisma.shiprocketShipment.findFirst({ where: { awbCode: awb } });
        if (shipment?.orderId) {
          await prisma.order.update({
            where: { id: shipment.orderId },
            data: { status: 'delivered' },
          });
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Shiprocket webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
