const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../../lib/prisma');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shopindia_dev_secret';

// Configure Nodemailer transporter with Gmail credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'shopindia36@gmail.com',
    pass: process.env.EMAIL_PASS || 'fhpdjjlceuzfppni',
  },
});

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

/**
 * POST /api/regional-admin/auth/forgot-password
 * Generates and sends a 6-digit OTP specifically for Regional Admin account password reset.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { regionalAdminProfile: true },
    });

    if (!user || (!user.regionalAdminProfile && user.role !== 'regional_admin' && user.role !== 'branch_manager' && user.role !== 'super_admin')) {
      return res.status(404).json({ error: 'No regional administrator account found with this email address.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: expiresAt,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"ShopIndia Regional Operations" <shopindia36@gmail.com>',
        to: normalizedEmail,
        subject: `ShopIndia Regional Admin Password Reset OTP: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #bfdbfe; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #1d4ed8; margin-bottom: 8px;">Regional Hub Command Center Security</h2>
            <p style="color: #475569; font-size: 14px;">You requested to reset your password for your ShopIndia Regional Administrator account.</p>
            <p style="color: #475569; font-size: 14px;">Your 6-digit verification code is:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1d4ed8; background: #eff6ff; padding: 12px 28px; border-radius: 8px; border: 1px dashed #1d4ed8; display: inline-block;">
                ${otp}
              </span>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This OTP will expire in 10 minutes. If you did not request this code, your account remains secure.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn('SMTP send failed (continuing with dev OTP):', mailErr.message);
    }

    res.json({
      success: true,
      message: 'Password reset OTP sent to your regional administrator email address.',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    console.error('Regional admin forgot password error:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP.' });
  }
});

/**
 * POST /api/regional-admin/auth/reset-password
 * Verifies OTP and updates Regional Admin password securely
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        resetOtp: otp.toString().trim(),
        resetOtpExpires: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP code. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    res.json({ success: true, message: 'Password updated successfully! You can now log in.' });
  } catch (err) {
    console.error('Regional admin reset password error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

module.exports = router;

