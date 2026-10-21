const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shopindia_dev_secret';

/**
 * POST /api/regional-admin/auth/register
 * Self-service registration for Regional Hub & Zone Administrators.
 * Enters pending_approval status awaiting Super Admin verification.
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      regionName,
      district,
      state,
      assignedPincodes = [],
      idProofUrl,
      branchId,
    } = req.body;

    if (!name || !email || !password || !regionName) {
      return res.status(400).json({ error: 'Name, email, password, and region name are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: 'regional_admin',
        branchId: branchId || undefined,
        regionalAdminProfile: {
          create: {
            regionName,
            district,
            state,
            assignedPincodes: Array.isArray(assignedPincodes) ? assignedPincodes : [assignedPincodes].filter(Boolean),
            idProofUrl,
            status: 'pending_approval',
            branchId: branchId || undefined,
          },
        },
      },
      include: {
        regionalAdminProfile: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Regional Admin application submitted! Your credentials will be activated upon Super Admin approval.',
      regionalAdmin: {
        id: user.id,
        name: user.name,
        email: user.email,
        regionName,
        status: user.regionalAdminProfile?.status,
      },
    });
  } catch (err) {
    console.error('Regional admin register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

/**
 * POST /api/regional-admin/auth/login
 * Regional Admin authentication
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { regionalAdminProfile: true },
    });

    if (!user || (user.role !== 'regional_admin' && user.role !== 'branch_manager' && user.role !== 'super_admin')) {
      return res.status(401).json({ error: 'Invalid regional admin credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const profile = user.regionalAdminProfile;
    // Super admins can bypass approval; regional admins must be approved
    if (user.role === 'regional_admin' && profile?.status !== 'approved') {
      return res.status(403).json({
        error: `Your Regional Admin account is ${profile?.status || 'pending'}. Awaiting Super Admin approval.`,
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        regionName: profile?.regionName,
        branchId: user.branchId || profile?.branchId,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      profile,
    });
  } catch (err) {
    console.error('Regional admin login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
