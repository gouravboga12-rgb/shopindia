const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../../lib/prisma');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shopindia_dev_secret';

/** POST /api/vendor/auth/register — FR-02.1: Vendor registration */
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, phone, password,
      businessName, contactName, gstNumber, panNumber,
      address, description, category,
    } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({ error: 'name, email, password, and businessName are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        role: 'vendor',
      },
    });

    const street = req.body.street || (address ? address.street : undefined);
    const city = req.body.city || (address ? address.city : undefined);
    const state = req.body.state || (address ? address.state : undefined);
    const pincode = req.body.pincode || (address ? address.pincode : undefined);
    const lat = req.body.lat !== undefined && req.body.lat !== null && req.body.lat !== '' ? parseFloat(req.body.lat) : null;
    const lng = req.body.lng !== undefined && req.body.lng !== null && req.body.lng !== '' ? parseFloat(req.body.lng) : null;
    const deliveryRadiusKm = req.body.deliveryRadiusKm !== undefined && req.body.deliveryRadiusKm !== null ? parseFloat(req.body.deliveryRadiusKm) : 25;
    const supportsQuick = req.body.supportsQuick !== undefined ? Boolean(req.body.supportsQuick) : true;

    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        businessName,
        contactName: contactName || name,
        email: email.toLowerCase(),
        phone: phone || '',
        gstNumber,
        panNumber,
        street,
        city,
        state,
        pincode,
        lat,
        lng,
        deliveryRadiusKm,
        supportsQuick,
        description,
        category,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { vendorId: vendor.id },
    });

    res.status(201).json({
      message: 'Registration submitted. Awaiting admin approval.',
      vendorId: vendor.id,
    });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** POST /api/vendor/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.role !== 'vendor') return res.status(401).json({ error: 'Invalid credentials.' });
    if (user.status !== 'active') return res.status(403).json({ error: `Account ${user.status}.` });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const vendor = await prisma.vendor.findUnique({
      where: { id: user.vendorId || '' },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor profile not found.' });
    if (vendor.approvalStatus !== 'approved') {
      return res.status(403).json({ error: `Vendor account is ${vendor.approvalStatus}. Contact admin.` });
    }

    const payload = {
      userId:      user.id,
      role:        'vendor',
      permissions: user.permissions || [],
      vendorId:    vendor.id,
      name:        user.name,
      email:       user.email,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: 'vendor' },
      vendor: {
        id:             vendor.id,
        businessName:   vendor.businessName,
        approvalStatus: vendor.approvalStatus,
        commissionRate: vendor.commissionRate,
        walletBalance:  vendor.walletBalance,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
