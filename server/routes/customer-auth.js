const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const customerAuth = require('../middleware/customerAuth');
const { sendPasswordResetEmail, sendSignupOtpEmail } = require('../lib/mailer');

const router = express.Router();

const sign = (u) =>
  jwt.sign(
    { userId: u.id, email: u.email, name: u.name, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ─── In-memory OTP store for pending signups (keyed by email) ────────────────
// Shape: { email: { name, hashedPassword, otp, expiresAt } }
const pendingSignups = new Map();

// Clean up expired entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of pendingSignups.entries()) {
    if (entry.expiresAt < now) pendingSignups.delete(email);
  }
}, 15 * 60 * 1000);

// ─── SIGNUP STEP 1: Send signup verification OTP ─────────────────────────────
/** POST /api/customer/send-signup-otp */
router.post('/send-signup-otp', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email is already registered
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(409).json({ error: 'This email is already registered. Please log in.' });
    }

    // Generate 6-digit OTP (valid 10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Hash password now so we don't keep plaintext in memory
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store pending signup
    pendingSignups.set(email.toLowerCase().trim(), {
      name: name.trim(),
      hashedPassword,
      otp,
      expiresAt,
    });

    // Send OTP email
    const mailResult = await sendSignupOtpEmail({
      to: email.trim(),
      name: name.trim(),
      otp,
    });

    res.json({
      success: true,
      message: 'Verification OTP sent to your email. Please check your inbox.',
      devOtp: mailResult.devMode ? otp : undefined,
    });
  } catch (err) {
    console.error('Send signup OTP error:', err);
    res.status(500).json({ error: err.message || 'Failed to send verification OTP.' });
  }
});

// ─── SIGNUP STEP 2: Verify OTP and create account ────────────────────────────
/** POST /api/customer/verify-signup-otp */
router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const key = email.toLowerCase().trim();
    const pending = pendingSignups.get(key);

    if (!pending) {
      return res.status(400).json({ error: 'No pending signup found. Please restart the registration.' });
    }
    if (Date.now() > pending.expiresAt) {
      pendingSignups.delete(key);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (pending.otp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Incorrect OTP code. Please check and try again.' });
    }

    // Check again if email was registered between step 1 and step 2
    const existing = await prisma.user.findUnique({ where: { email: key } });
    if (existing) {
      pendingSignups.delete(key);
      return res.status(409).json({ error: 'This email is already registered. Please log in.' });
    }

    // Create the verified account
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: key,
        password: pending.hashedPassword,
        role: 'customer',
      },
    });

    // Clean up
    pendingSignups.delete(key);

    res.status(201).json({
      token: sign(user),
      user: { id: user.id, name: user.name, email: user.email, role: 'customer' },
    });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    res.status(500).json({ error: err.message || 'Failed to verify OTP and create account.' });
  }
});

/** POST /api/customer/register — legacy direct register (kept for backward compat) */
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

/** POST /api/customer/login — authenticate a customer */
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

/** GET /api/customer/me — current logged-in customer */
router.get('/me', customerAuth, (req, res) => {
  res.json({ id: req.user.userId, name: req.user.name, email: req.user.email, role: 'customer' });
});

module.exports = router;
