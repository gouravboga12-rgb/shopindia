const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('rider'));

/**
 * GET /api/rider/profile
 * Get authenticated rider profile & KYC verification status
 */
router.get('/', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        riderProfile: {
          include: {
            branch: { select: { id: true, name: true, city: true } },
          },
        },
      },
    });

    if (!user || !user.riderProfile) {
      return res.status(404).json({ error: 'Rider profile not found.' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      },
      profile: user.riderProfile,
    });
  } catch (err) {
    console.error('Fetch rider profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/rider/profile
 * Update vehicle, radius slider (10-100km), address, etc.
 */
router.patch('/', async (req, res) => {
  try {
    const {
      serviceRadiusKm,
      vehicleType,
      vehicleNumber,
      licenseNumber,
      licenseUrl,
      aadhaarNumber,
      aadhaarUrl,
      panNumber,
      panUrl,
      rcUrl,
      photoUrl,
      address,
      currentLat,
      currentLng,
    } = req.body;

    const data = {};
    if (serviceRadiusKm !== undefined) data.serviceRadiusKm = parseInt(serviceRadiusKm, 10);
    if (vehicleType !== undefined) data.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) data.vehicleNumber = vehicleNumber;
    if (licenseNumber !== undefined) data.licenseNumber = licenseNumber;
    if (licenseUrl !== undefined) data.licenseUrl = licenseUrl;
    if (aadhaarNumber !== undefined) data.aadhaarNumber = aadhaarNumber;
    if (aadhaarUrl !== undefined) data.aadhaarUrl = aadhaarUrl;
    if (panNumber !== undefined) data.panNumber = panNumber;
    if (panUrl !== undefined) data.panUrl = panUrl;
    if (rcUrl !== undefined) data.rcUrl = rcUrl;
    if (photoUrl !== undefined) data.photoUrl = photoUrl;
    if (address !== undefined) data.address = address;
    if (currentLat !== undefined) data.currentLat = parseFloat(currentLat);
    if (currentLng !== undefined) data.currentLng = parseFloat(currentLng);

    const updated = await prisma.riderProfile.update({
      where: { userId: req.user.userId },
      data,
    });

    res.json({ success: true, profile: updated });
  } catch (err) {
    console.error('Update rider profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/rider/status
 * Toggle Online/Offline and update live GPS coordinates
 */
router.patch('/status', async (req, res) => {
  try {
    const { isOnline, currentLat, currentLng } = req.body;
    const data = {};
    if (isOnline !== undefined) data.isOnline = Boolean(isOnline);
    if (currentLat !== undefined) data.currentLat = parseFloat(currentLat);
    if (currentLng !== undefined) data.currentLng = parseFloat(currentLng);

    const updated = await prisma.riderProfile.update({
      where: { userId: req.user.userId },
      data,
    });

    res.json({
      success: true,
      isOnline: updated.isOnline,
      currentLat: updated.currentLat,
      currentLng: updated.currentLng,
    });
  } catch (err) {
    console.error('Toggle rider status error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
