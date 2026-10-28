const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('regional_admin', 'branch_manager', 'super_admin'));

/**
 * Helper to fetch Regional Admin Profile and branch association
 */
async function getAdminProfile(userId) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { regionalAdminProfile: true },
  });
  return user?.regionalAdminProfile || null;
}

/**
 * GET /api/regional-admin/dashboard
 * Live pulse of regional metrics: active deliveries, online riders, GMV, orders
 */
router.get('/dashboard', async (req, res) => {
  try {
    const profile = await getAdminProfile(req.user?.userId || req.user?.id);
    const branchFilter = profile?.branchId ? { branchId: profile.branchId } : {};

    // Parallel fetch scoped statistics
    const [
      activeDeliveries,
      onlineRidersCount,
      totalRegionalRiders,
      pendingApprovalRiders,
      recentDeliveries,
      regionalOrders,
    ] = await Promise.all([
      // Active deliveries (quick commerce)
      prisma.delivery.count({
        where: {
          status: { in: ['broadcasted', 'assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'] },
        },
      }),
      // Online riders
      prisma.riderProfile.count({
        where: {
          isOnline: true,
          ...branchFilter,
        },
      }),
      // Total riders
      prisma.riderProfile.count({
        where: branchFilter,
      }),
      // Pending KYC verification riders
      prisma.riderProfile.count({
        where: {
          isApproved: false,
          ...branchFilter,
        },
      }),
      // Recent deliveries list
      prisma.delivery.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true, total: true, status: true } },
          riderProfile: {
            select: {
              id: true,
              user: { select: { name: true, phone: true } },
              vehicleType: true,
              vehicleNumber: true,
            },
          },
        },
      }),
      // Regional orders for GMV calculation
      prisma.order.findMany({
        where: branchFilter,
        select: { total: true, createdAt: true, status: true },
        take: 100,
      }),
    ]);

    const regionalGmv = regionalOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    res.json({
      profile,
      metrics: {
        activeDeliveries,
        onlineRidersCount,
        totalRegionalRiders,
        pendingApprovalRiders,
        regionalGmv,
        totalOrdersCount: regionalOrders.length,
      },
      recentDeliveries,
    });
  } catch (err) {
    console.error('Regional admin dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/regional-admin/vendors
 * List vendors within this region/branch with their live dispatch status
 */
router.get('/vendors', async (req, res) => {
  try {
    const profile = await getAdminProfile(req.user?.userId || req.user?.id);
    const branchFilter = profile?.branchId ? { branchId: profile.branchId } : {};

    const vendors = await prisma.vendor.findMany({
      where: branchFilter,
      include: {
        orders: {
          where: {
            status: { in: ['placed', 'confirmed', 'packing', 'processing'] },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            type: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ vendors });
  } catch (err) {
    console.error('Regional admin vendors error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/regional-admin/riders
 * Regional rider fleet, approval queue, and active statuses
 */
router.get('/riders', async (req, res) => {
  try {
    const profile = await getAdminProfile(req.user?.userId || req.user?.id);
    const branchFilter = profile?.branchId ? { branchId: profile.branchId } : {};

    const riders = await prisma.riderProfile.findMany({
      where: branchFilter,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatar: true, status: true } },
        branch: { select: { id: true, name: true, city: true } },
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ riders });
  } catch (err) {
    console.error('Regional admin riders error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/regional-admin/riders/:id/verify
 * Approve or reject regional rider KYC
 */
router.patch('/riders/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const rider = await prisma.riderProfile.update({
      where: { id },
      data: {
        isApproved: Boolean(approved),
        isActive: Boolean(approved),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (rider?.user?.id) {
      await prisma.user.update({
        where: { id: rider.user.id },
        data: { status: approved ? 'active' : 'suspended' },
      });
    }

    res.json({
      success: true,
      message: `Rider ${rider.user.name} KYC ${approved ? 'approved' : 'rejected'}.`,
      rider,
    });
  } catch (err) {
    console.error('Verify rider error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/regional-admin/deliveries/live
 * Real-time map of all quick-commerce trips & Shiprocket shipments in transit
 */
router.get('/deliveries/live', async (req, res) => {
  try {
    const [quickCommerceDeliveries, onlineRiders, shiprocketShipments] = await Promise.all([
      prisma.delivery.findMany({
        where: {
          status: { in: ['broadcasted', 'assigned', 'arrived_pickup', 'picked_up', 'arrived_customer'] },
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              type: true,
              vendor: { select: { businessName: true, phone: true } },
            },
          },
          riderProfile: {
            select: {
              id: true,
              currentLat: true,
              currentLng: true,
              vehicleType: true,
              vehicleNumber: true,
              user: { select: { name: true, phone: true } },
            },
          },
        },
      }),
      prisma.riderProfile.findMany({
        where: { isOnline: true },
        select: {
          id: true,
          currentLat: true,
          currentLng: true,
          vehicleType: true,
          vehicleNumber: true,
          serviceRadiusKm: true,
          user: { select: { name: true, phone: true, avatar: true } },
        },
      }),
      prisma.shiprocketShipment.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, total: true, deliveryLine1: true, deliveryCity: true, deliveryPincode: true } },
          vendor: { select: { businessName: true, city: true } },
        },
      }),
    ]);

    res.json({
      deliveries: quickCommerceDeliveries,
      onlineRiders,
      shiprocketShipments,
    });
  } catch (err) {
    console.error('Regional live deliveries error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/deliveries/:id/reassign
 * Emergency reassignment or re-broadcasting of delayed order
 */
router.post('/deliveries/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await prisma.delivery.update({
      where: { id },
      data: {
        riderProfileId: null,
        status: 'broadcasted',
        assignedAt: null,
      },
      include: { order: true },
    });

    res.json({
      success: true,
      message: `Delivery ${delivery.order.orderNumber} re-broadcasted to available riders.`,
      delivery,
    });
  } catch (err) {
    console.error('Reassign delivery error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/regional-admin/demand-leads
 * Fetches service demand leads matching regional admin's assigned pincodes
 */
router.get('/demand-leads', async (req, res) => {
  try {
    const profile = await getAdminProfile(req.user?.userId || req.user?.id);
    const assignedPincodes = profile?.assignedPincodes || [];

    const where = assignedPincodes.length > 0
      ? { pincode: { in: assignedPincodes } }
      : {};

    const leads = await prisma.serviceDemandLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(leads);
  } catch (err) {
    console.error('[RegionalAdmin] Error fetching demand leads:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/regional-admin/location
 * Returns current regional admin base station location and assigned territory
 */
router.get('/location', async (req, res) => {
  try {
    const profile = await getAdminProfile(req.user?.userId || req.user?.id);
    if (!profile) return res.status(404).json({ error: 'Regional admin profile not found.' });
    res.json({
      success: true,
      regionName: profile.regionName,
      district: profile.district,
      state: profile.state,
      assignedPincodes: profile.assignedPincodes || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/regional-admin/location
 * Updates regional admin base station location, address, geocoded coordinates, and assigned pincodes
 */
router.patch('/location', async (req, res) => {
  try {
    const { regionName, address, district, state, pincode, pincodes } = req.body;
    const profile = await getAdminProfile(req.user?.userId || req.user?.id);
    if (!profile) return res.status(404).json({ error: 'Regional admin profile not found.' });

    let newPincodes = Array.isArray(pincodes) ? [...pincodes] : [...(profile.assignedPincodes || [])];
    if (pincode && !newPincodes.includes(String(pincode).trim())) {
      newPincodes.push(String(pincode).trim());
    }

    if (address) {
      const matchPin = address.match(/\b([1-9][0-9]{5})\b/);
      if (matchPin && !newPincodes.includes(matchPin[1])) {
        newPincodes.push(matchPin[1]);
      }
    }

    const updated = await prisma.regionalAdminProfile.update({
      where: { id: profile.id },
      data: {
        regionName: regionName ? regionName.trim() : (address ? address.split(',')[0].trim() : profile.regionName),
        district: district || profile.district,
        state: state || profile.state,
        assignedPincodes: newPincodes,
      },
    });

    res.json({
      success: true,
      message: 'Regional hub base station location updated successfully.',
      profile: updated,
    });
  } catch (err) {
    console.error('Update regional admin location error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

