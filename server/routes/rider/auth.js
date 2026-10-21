const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shopindia_dev_secret';

// Configure Nodemailer transporter with Gmail credentials from env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'shopindia36@gmail.com',
    pass: process.env.EMAIL_PASS || 'fhpdjjlceuzfppni',
  },
});

/**
 * POST /api/rider/auth/register
 * Register a new delivery partner with personal details, KYC docs, and service radius.
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      vehicleType = 'bike',
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
      serviceRadiusKm = 25,
      branchId,
    } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role rider
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        phone,
        password: hashedPassword,
        role: 'rider',
        avatar: photoUrl,
        branchId: branchId || undefined,
        riderProfile: {
          create: {
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
            currentLat: currentLat ? parseFloat(currentLat) : null,
            currentLng: currentLng ? parseFloat(currentLng) : null,
            serviceRadiusKm: parseInt(serviceRadiusKm, 10) || 25,
            isOnline: true,
            isApproved: false, // requires admin/regional admin review
            branchId: branchId || undefined,
          },
        },
      },
      include: {
        riderProfile: true,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        role: 'rider',
        riderProfileId: user.riderProfile?.id,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Rider account registered successfully. Verification pending approval.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'rider',
      },
      profile: user.riderProfile,
    });
  } catch (err) {
    console.error('Rider register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

/**
 * POST /api/rider/auth/login
 * Rider authentication
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { riderProfile: true },
    });

    if (!user || user.role !== 'rider') {
      return res.status(401).json({ error: 'Invalid rider credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: `Account is ${user.status}. Please contact support.` });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid rider credentials.' });
    }

    // Auto-create rider profile if missing
    let profile = user.riderProfile;
    if (!profile) {
      profile = await prisma.riderProfile.create({
        data: {
          userId: user.id,
          isOnline: true,
          serviceRadiusKm: 25,
        },
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: 'rider',
        riderProfileId: profile.id,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'rider',
      },
      profile,
    });
  } catch (err) {
    console.error('Rider login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

/**
 * POST /api/rider/auth/send-otp
 * Dispatches a 6-digit email OTP for onboarding verification or password reset.
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.updateMany({
      where: { email: email.toLowerCase().trim() },
      data: {
        resetOtp: otp,
        resetOtpExpires: expiresAt,
      },
    });

    // Send email via Gmail SMTP
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"ShopIndia Deliveries" <shopindia36@gmail.com>',
        to: email,
        subject: 'ShopIndia Rider Verification Code: ' + otp,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f2c59; margin-bottom: 8px;">ShopIndia Delivery Partner</h2>
            <p style="color: #475569; font-size: 14px;">Use the following 6-digit one-time password (OTP) to verify your rider account:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; background: #ecfdf5; padding: 10px 24px; border-radius: 6px; border: 1px dashed #059669;">
                ${otp}
              </span>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn('SMTP send failed (continuing with dev OTP):', mailErr.message);
    }

    res.json({ success: true, message: 'OTP sent to email.', devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/auth/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required.' });

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        resetOtp: otp,
        resetOtpExpires: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Clear OTP after successful verification
    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtp: null, resetOtpExpires: null },
    });

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
