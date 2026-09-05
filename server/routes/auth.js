const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { sendPasswordResetEmail } = require('../lib/mailer');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shopindia_dev_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

/** POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (user.status !== 'active') {
      return res.status(403).json({ error: `Account is ${user.status}.` });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    let userPermissions = user.permissions || [];
    
    // Fallback: If user has no specific permissions set, fetch the default permissions for their role
    if (userPermissions.length === 0 && user.role && user.role !== 'customer') {
      try {
        const dbRole = await prisma.role.findUnique({
          where: { name: user.role },
          include: { permissions: true }
        });
        if (dbRole && dbRole.permissions) {
          userPermissions = dbRole.permissions.map(p => p.permission);
        }
      } catch (err) {
        console.error('Failed to fetch role permissions:', err);
      }
    }

    // Build token payload — include vendorId if vendor role
    const payload = {
      userId:      user.id,
      role:        user.role,
      permissions: userPermissions,
      name:        user.name,
      email:       user.email,
    };
    if (user.vendorId) payload.vendorId = user.vendorId;
    if (user.branchId) payload.branchId = user.branchId;

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.json({
      token,
      user: {
        id:          user.id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        permissions: userPermissions,
        vendorId:    user.vendorId,
        avatar:      user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/auth/forgot-password — generate 6-digit OTP and send via Nodemailer */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: `Account is currently ${user.status}. Please contact support.` });
    }

    // Generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Expiration: 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: expiresAt,
      },
    });

    // Send email using Nodemailer (Gmail App Password or SMTP)
    const mailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    res.json({
      success: true,
      message: 'Password reset OTP has been sent to your email address.',
      devOtp: mailResult.devMode ? otp : undefined,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message || 'Failed to process password reset request.' });
  }
});

/** POST /api/auth/verify-otp — verify the 6-digit OTP code */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new code.' });
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (user.resetOtp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Incorrect OTP code. Please check and try again.' });
    }

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/auth/reset-password — verify OTP and update to new password */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new code.' });
    }

    if (new Date() > new Date(user.resetOtpExpires)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (user.resetOtp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Incorrect OTP code. Please check and try again.' });
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

    res.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

/** POST /api/auth/logout — client-side: just discard token. */
router.post('/logout', (_req, res) => res.json({ message: 'Logged out.' }));

module.exports = router;
