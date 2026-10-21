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
      partnerType = 'delivery',
      skills = [],
      experienceYears = 1,
    } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { riderProfile: true },
    });

    if (existing && existing.riderProfile) {
      return res.status(409).json({ error: 'A delivery partner account with this email already exists. Please sign in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const parsedSkills = Array.isArray(skills) ? skills : (typeof skills === 'string' && skills.trim() ? [skills.trim()] : []);
    const parsedExp = parseInt(experienceYears, 10) || 1;

    let user;
    if (existing) {
      // User exists from customer/main shop; upgrade to rider role and attach rider profile
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          phone: phone || existing.phone,
          password: hashedPassword,
          role: 'rider',
          avatar: photoUrl || existing.avatar,
          branchId: branchId || existing.branchId || undefined,
          riderProfile: {
            create: {
              partnerType: partnerType || 'delivery',
              skills: parsedSkills,
              experienceYears: parsedExp,
              vehicleType: vehicleType || 'bike',
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
    } else {
      user = await prisma.user.create({
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
              partnerType: partnerType || 'delivery',
              skills: parsedSkills,
              experienceYears: parsedExp,
              vehicleType: vehicleType || 'bike',
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
    }


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

/**
 * POST /api/rider/auth/forgot-password
 * Generates and sends a 6-digit OTP specifically for Delivery Partner account password reset.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { riderProfile: true },
    });

    if (!user || (!user.riderProfile && user.role !== 'rider')) {
      return res.status(404).json({ error: 'No delivery partner account found with this email address.' });
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
        from: process.env.EMAIL_FROM || '"ShopIndia Delivery Fleet" <shopindia36@gmail.com>',
        to: normalizedEmail,
        subject: `ShopIndia Delivery Partner Password Reset OTP: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #fed7aa; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #ea580c; margin-bottom: 8px;">Delivery Partner Account Security</h2>
            <p style="color: #475569; font-size: 14px;">You requested to reset your password for your ShopIndia Delivery Partner account.</p>
            <p style="color: #475569; font-size: 14px;">Your 6-digit verification code is:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #ea580c; background: #fff7ed; padding: 12px 28px; border-radius: 8px; border: 1px dashed #ea580c; display: inline-block;">
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
      message: 'Password reset OTP sent to your email address.',
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (err) {
    console.error('Rider forgot password error:', err);
    res.status(500).json({ error: err.message || 'Failed to send OTP.' });
  }
});

/**
 * POST /api/rider/auth/reset-password
 * Verifies OTP and updates Delivery Partner password securely
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
    console.error('Rider reset password error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

module.exports = router;

