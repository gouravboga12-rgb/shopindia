const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const customerAuth = require('../middleware/customerAuth');
const { sendPasswordResetEmail } = require('../lib/mailer');

const router = express.Router();

const sign = (u) =>
  jwt.sign(
    { userId: u.id, email: u.email, name: u.name, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

/** POST /api/auth/register — create a customer account */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 10), role: 'customer' },
    });
    res.status(201).json({
      token: sign(user),
      user: { id: user.id, name: user.name, email: user.email, role: 'customer' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/auth/login — authenticate a customer */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    res.json({
      token: sign(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/forgot-password */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpires: expiresAt,
      },
    });

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
    console.error('Customer forgot password error:', err);
    res.status(500).json({ error: err.message || 'Failed to process password reset request.' });
  }
});

/** POST /api/customer/verify-otp */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
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

/** POST /api/customer/reset-password */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
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
    console.error('Customer reset password error:', err);
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
});

/** GET /api/auth/me — current logged-in customer */
router.get('/me', customerAuth, (req, res) => {
  res.json({ id: req.user.userId, name: req.user.name, email: req.user.email, role: 'customer' });
});

module.exports = router;
