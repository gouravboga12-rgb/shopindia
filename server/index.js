require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const prisma = require('./lib/prisma');

const app = express();
app.set('trust proxy', 1); // trust Nginx reverse proxy so req.ip is the real client IP
const PORT = process.env.PORT || 5001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiter — 2000 req/15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', engine: 'PostgreSQL/RDS', ts: new Date() }));

app.use('/api/auth', require('./routes/auth'));

// Public storefront + customer auth
app.use('/api/customer', require('./routes/customer-auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/support', require('./routes/support'));

// Customer account dashboard (all guarded by customerAuth inside each route file)
app.use('/api/customer/profile', require('./routes/customer/profile'));
app.use('/api/customer/wishlist', require('./routes/customer/wishlist'));
app.use('/api/customer/cart', require('./routes/customer/cart'));
app.use('/api/customer/addresses', require('./routes/customer/addresses'));
app.use('/api/customer/payments', require('./routes/customer/payments'));
app.use('/api/customer/notifications', require('./routes/customer/notifications'));
app.use('/api/customer/reviews', require('./routes/customer/reviews'));
app.use('/api/customer/coupons', require('./routes/customer/coupons'));
app.use('/api/customer/analytics', require('./routes/customer/analytics'));
app.use('/api/customer/orders', require('./routes/customer/order-actions'));

// Admin routes (all guarded by verifyToken + requireRole in each route file)
app.use('/api/admin/dashboard', require('./routes/admin/dashboard'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/vendors', require('./routes/admin/vendors'));
app.use('/api/admin/products', require('./routes/admin/products'));
app.use('/api/admin/orders', require('./routes/admin/orders'));
app.use('/api/admin/branches', require('./routes/admin/branches'));
app.use('/api/admin/rbac', require('./routes/admin/rbac'));
app.use('/api/admin/service-areas', require('./routes/admin/serviceAreas'));
app.use('/api/admin/support', require('./routes/admin/support'));
app.use('/api/admin/commissions', require('./routes/admin/commissions'));
app.use('/api/admin/riders', require('./routes/admin/riders'));
app.use('/api/admin/reports', require('./routes/admin/reports'));
app.use('/api/admin/offers', require('./routes/admin/offers'));
app.use('/api/admin/notifications', require('./routes/admin/notifications'));
app.use('/api/admin/categories', require('./routes/admin/categories'));
app.use('/api/admin/banners', require('./routes/admin/banners'));
app.use('/api/admin/reviews', require('./routes/admin/reviews'));

// Vendor routes (guarded by verifyToken + requireRole('vendor') in each file)
app.use('/api/vendor/auth', require('./routes/vendor/auth'));
app.use('/api/vendor/products', require('./routes/vendor/products'));
app.use('/api/vendor/orders', require('./routes/vendor/orders'));
app.use('/api/vendor/analytics', require('./routes/vendor/analytics'));
app.use('/api/vendor/wallet', require('./routes/vendor/wallet'));
app.use('/api/vendor/reviews', require('./routes/vendor/reviews'));
app.use('/api/vendor/technicians', require('./routes/vendor/technicians'));
app.use('/api/vendor/service-jobs', require('./routes/vendor/service-jobs'));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
prisma.$connect()
  .then(() => {
    console.log(`✅ PostgreSQL / Amazon RDS connected via Prisma ORM`);
    app.listen(PORT, () => console.log(`🚀 Server listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ RDS connection failed:', err.message);
    process.exit(1);
  });