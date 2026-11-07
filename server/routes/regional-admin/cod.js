'use strict';
/**
 * server/routes/regional-admin/cod.js
 * Regional Admin Fleet Cash on Delivery (COD) Float & Compliance Monitoring Hub.
 * Dedicated to tracking fleet cash-in-hand, enforcing float limits, sending clearance alerts,
 * and managing rider contact details. (Physical cash custody & bulk HQ remittance flows removed).
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('super_admin', 'regional_admin', 'branch_manager'));

/**
 * Helper to compute great-circle distance between two GPS coordinates in km
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper to fetch Regional Admin profile
 */
async function getAdminProfile(userId) {
  return prisma.regionalAdminProfile.findUnique({
    where: { userId },
    include: { branch: true },
  });
}

/**
 * GET /api/regional-admin/cod
 * Returns territory fleet COD float oversight data, risk counts, and individual rider ledgers.
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const profile = await getAdminProfile(userId);

    const hubLat = profile?.currentLat;
    const hubLng = profile?.currentLng;
    const branchFilter = profile?.branchId ? { branchId: profile.branchId } : {};

    // Fetch all active/approved riders in this territory
    const rawRiders = await prisma.riderProfile.findMany({
      where: {
        isApproved: true,
        isActive: true,
        ...branchFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        deliveries: {
          where: {
            status: 'delivered',
            order: {
              paymentMethod: 'cod',
              status: { notIn: ['cancelled', 'refunded'] },
            },
          },
          select: {
            id: true,
            deliveryFee: true,
            codAmount: true,
            deliveredAt: true,
            createdAt: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
                deliveryLine1: true,
                deliveryLine2: true,
                deliveryCity: true,
                deliveryPincode: true,
                customer: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: { deliveredAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { codCashFloat: 'desc' },
    });

    // Deduplicate riders by phone or user ID and territory scope
    const seenPhones = new Set();
    const riders = [];

    for (const r of rawRiders) {
      const phone = (r.user?.phone || '').replace(/\D/g, '');
      const riderId = r.userId || r.id;
      if (phone && seenPhones.has(phone)) continue;
      if (phone) seenPhones.add(phone);

      // Check GPS distance if coordinates available
      if (hubLat && hubLng && r.currentLat && r.currentLng) {
        const dist = haversineDistanceKm(hubLat, hubLng, r.currentLat, r.currentLng);
        if (dist > 50) continue; // Outside territory operational radius
      }

      const floatAmount = Number(r.codCashFloat || 0);
      const floatLimit = Number(r.codFloatLimit || 3000);
      const floatPercent = floatLimit > 0 ? Math.min(100, Math.round((floatAmount / floatLimit) * 100)) : 0;

      let riskLevel = 'safe'; // safe | warning | breached
      if (floatAmount >= floatLimit) {
        riskLevel = 'breached';
      } else if (floatPercent >= 70) {
        riskLevel = 'warning';
      }

      riders.push({
        id: r.id,
        userId: r.userId,
        name: r.user?.name || 'Rider Partner',
        phone: r.user?.phone || '',
        email: r.user?.email || '',
        vehicleType: r.vehicleType || 'bike',
        vehicleNumber: r.vehicleNumber || 'Unassigned',
        isOnline: Boolean(r.isOnline),
        isApproved: Boolean(r.isApproved),
        codCashFloat: Math.round(floatAmount * 100) / 100,
        codFloatLimit: floatLimit,
        floatPercent,
        riskLevel,
        walletBalance: Math.round(Number(r.walletBalance || 0) * 100) / 100,
        totalDeliveries: r.totalDeliveries || 0,
        recentCODDeliveries: r.deliveries.map((d) => ({
          id: d.id,
          orderNumber: d.order?.orderNumber || `OD-${d.id.slice(0, 8).toUpperCase()}`,
          amount: Number(d.codAmount || d.order?.total || 0),
          customerName: d.order?.customer?.name || 'Customer',
          customerPhone: d.order?.customer?.phone || '',
          deliveredAt: d.deliveredAt || d.createdAt,
          address: [d.order?.deliveryLine1, d.order?.deliveryLine2, d.order?.deliveryCity, d.order?.deliveryPincode].filter(Boolean).join(', ') || 'Area Dropoff',
        })),
      });
    }

    // Compute territory aggregates
    const totalFleetCashFloat = Math.round(riders.reduce((sum, r) => sum + r.codCashFloat, 0) * 100) / 100;
    const ridersHoldingCashCount = riders.filter((r) => r.codCashFloat > 0).length;
    const highRiskCount = riders.filter((r) => r.riskLevel === 'breached' || r.riskLevel === 'warning').length;
    const compliantCount = riders.filter((r) => r.codCashFloat === 0).length;

    res.json({
      success: true,
      hubName: profile?.branch?.name || profile?.regionName || 'Regional Operations Hub',
      district: profile?.district || 'Medchal-Malkajgiri',
      metrics: {
        totalFleetCashFloat,
        ridersHoldingCashCount,
        highRiskCount,
        compliantCount,
        totalTerritoryRiders: riders.length,
        defaultFloatLimit: 3000,
      },
      riders,
    });
  } catch (err) {
    console.error('[Regional Admin COD] Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/cod/riders/:id/send-alert
 * Dispatches an instant operational reminder alert to the rider to clear their pending COD cash float.
 */
router.post('/riders/:id/send-alert', async (req, res) => {
  try {
    const { id } = req.params;
    const { customMessage } = req.body;

    const rider = await prisma.riderProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!rider) {
      return res.status(404).json({ error: 'Rider profile not found.' });
    }

    const floatAmount = Number(rider.codCashFloat || 0);
    const recipientPhone = rider.user?.phone || rider.user?.email || 'Rider';
    const message =
      customMessage ||
      `Shop India Operations Alert: You currently hold ₹${floatAmount.toFixed(
        2
      )} in collected COD cash. Please settle your float via your Rider App wallet to keep receiving delivery orders.`;

    // Record notification log
    await prisma.notificationLog.create({
      data: {
        recipient: recipientPhone,
        type: 'SMS',
        event: 'COD_CLEARANCE_ALERT',
        status: 'sent',
        message,
        sentAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `COD clearance alert successfully sent to ${rider.user?.name || 'Rider'} (${recipientPhone}).`,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Regional COD Send Alert] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/regional-admin/cod/riders/:id/contact
 * Updates a rider's phone number, WhatsApp contact, or name if their panel/contact details change.
 */
router.patch('/riders/:id/contact', async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, name } = req.body;

    const rider = await prisma.riderProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!rider) {
      return res.status(404).json({ error: 'Rider profile not found.' });
    }

    const updateData = {};
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
      }
      updateData.phone = cleanPhone;
    }
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No contact details provided to update.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: rider.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    res.json({
      success: true,
      message: `Contact details for ${updatedUser.name} updated successfully.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error('[Regional COD Update Contact] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
