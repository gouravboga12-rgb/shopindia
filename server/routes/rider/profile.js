const express = require('express');
const multer = require('multer');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { uploadToS3 } = require('../../lib/s3');

const router = express.Router();
router.use(verifyToken, requireRole('rider'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

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
 * POST /api/rider/profile/upload-doc
 * Direct upload of Rider KYC documents (Driving License, Aadhaar, PAN, RC, Avatar) to AWS S3
 */
router.post('/upload-doc', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided.' });
    }

    const docType = req.body.docType || 'general';
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `rider-docs/${req.user.userId}/${docType}-${Date.now()}-${safeName}`;

    const result = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      isPrivate: false,
    });

    res.json({
      success: true,
      url: result.url,
      key,
      docType,
    });
  } catch (err) {
    console.error('Rider doc upload error:', err);
    res.status(500).json({ error: err.message || 'S3 document upload failed' });
  }
});

/**
 * PATCH /api/rider/profile
 * Full update for rider details: Name, Phone, Vehicle, KYC, Bank/UPI, Address, Radius
 * Strictly persisted to AWS RDS PostgreSQL
 */
router.patch('/', async (req, res) => {
  try {
    const {
      name,
      phone,
      avatar,
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
      partnerType,
      skills,
      experienceYears,
      upiId,
      accountHolder,
      accountNumber,
      ifsc,
      bankName,
    } = req.body;

    // 1. Update User model if personal details changed
    let updatedUser = null;
    if (name !== undefined || phone !== undefined || avatar !== undefined) {
      const userData = {};
      if (name !== undefined) userData.name = name.trim();
      if (phone !== undefined) userData.phone = phone.trim();
      if (avatar !== undefined) userData.avatar = avatar;

      updatedUser = await prisma.user.update({
        where: { id: req.user.userId },
        data: userData,
        select: { id: true, name: true, email: true, phone: true, avatar: true },
      });
    }

    // 2. Update RiderProfile model
    const data = {};
    if (serviceRadiusKm !== undefined) data.serviceRadiusKm = parseInt(serviceRadiusKm, 10);
    if (vehicleType !== undefined) data.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) data.vehicleNumber = vehicleNumber.trim().toUpperCase();
    if (licenseNumber !== undefined) data.licenseNumber = licenseNumber.trim().toUpperCase();
    if (licenseUrl !== undefined) data.licenseUrl = licenseUrl;
    if (aadhaarNumber !== undefined) data.aadhaarNumber = aadhaarNumber.trim();
    if (aadhaarUrl !== undefined) data.aadhaarUrl = aadhaarUrl;
    if (panNumber !== undefined) data.panNumber = panNumber.trim().toUpperCase();
    if (panUrl !== undefined) data.panUrl = panUrl;
    if (rcUrl !== undefined) data.rcUrl = rcUrl;
    if (photoUrl !== undefined) data.photoUrl = photoUrl;
    if (address !== undefined) data.address = address;
    if (currentLat !== undefined) data.currentLat = parseFloat(currentLat);
    if (currentLng !== undefined) data.currentLng = parseFloat(currentLng);
    if (partnerType !== undefined) data.partnerType = partnerType;
    if (skills !== undefined) {
      data.skills = Array.isArray(skills)
        ? skills
        : typeof skills === 'string' && skills.trim()
        ? [skills.trim()]
        : [];
    }
    if (experienceYears !== undefined) data.experienceYears = parseInt(experienceYears, 10) || 1;
    if (upiId !== undefined) data.upiId = upiId.trim();
    if (accountHolder !== undefined) data.accountHolder = accountHolder.trim();
    if (accountNumber !== undefined) data.accountNumber = accountNumber.trim();
    if (ifsc !== undefined) data.ifsc = ifsc.trim().toUpperCase();
    if (bankName !== undefined) data.bankName = bankName.trim();

    const updatedProfile = await prisma.riderProfile.update({
      where: { userId: req.user.userId },
      data,
      include: {
        branch: { select: { id: true, name: true, city: true } },
      },
    });

    if (!updatedUser) {
      updatedUser = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, name: true, email: true, phone: true, avatar: true },
      });
    }

    res.json({
      success: true,
      profile: updatedProfile,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Update rider profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/rider/profile/status
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
