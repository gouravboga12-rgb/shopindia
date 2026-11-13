const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }       = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken);

// Middleware for routes that require manage_vendors specifically
const restrictManage = requirePermission('manage_vendors');
// Middleware for routes that only require view_vendors (manage_vendors is also fine)
const restrictView = requirePermission('view_vendors', 'manage_vendors');

/** GET /api/admin/vendors?status=&service=&page=&q= — FR-05.2 */
router.get('/', restrictView, async (req, res) => {
  try {
    const { status, service, page = 1, limit = 50, q } = req.query;
    const where = {};
    if (status && status !== 'all') where.approvalStatus = status;
    if (service === 'quick') {
      where.supportsQuick = true;
    } else if (service === 'traditional') {
      where.supportsQuick = false;
    }

    if (q) {
      where.OR = [
        { businessName: { contains: q, mode: 'insensitive' } },
        { contactName:  { contains: q, mode: 'insensitive' } },
        { email:        { contains: q, mode: 'insensitive' } },
        { phone:        { contains: q, mode: 'insensitive' } },
        { city:         { contains: q, mode: 'insensitive' } },
        { state:        { contains: q, mode: 'insensitive' } },
        { pincode:      { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum  = Number(page);
    const limitNum = Number(limit);

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          documents: true,
          products: {
            select: { fulfillmentType: true },
            distinct: ['fulfillmentType'],
          },
          _count: {
            select: { products: true, orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.vendor.count({ where }),
    ]);

    // Enhance vendors with computed service type
    const enhanced = vendors.map((v) => {
      const types = (v.products || []).map((p) => p.fulfillmentType);
      const hasTraditional = types.includes('traditional');
      const hasQuick = Boolean(v.supportsQuick || types.includes('quick_commerce'));

      let serviceType = 'traditional_only';
      let serviceLabel = 'Shop India Only';
      if (hasTraditional && hasQuick) {
        serviceType = 'both';
        serviceLabel = 'Shop India & Quick Shopping';
      } else if (hasQuick) {
        serviceType = 'quick_only';
        serviceLabel = 'Quick Shopping Only';
      }

      return {
        ...v,
        serviceType,
        serviceLabel,
      };
    });

    res.json({ vendors: enhanced, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/vendors/:id */
router.get('/:id', restrictView, async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        documents: true,
      },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });
    res.json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/admin/vendors/:id/approval — approve/reject/suspend — FR-05.2 */
router.patch('/:id/approval', restrictManage, async (req, res) => {
  try {
    const { approvalStatus, approvalNote } = req.body;
    if (!['approved', 'rejected', 'suspended'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approval status.' });
    }
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        approvalStatus,
        approvalNote,
        approvedById: req.user.userId,
        approvedAt: new Date(),
      },
    });

    // Real-time broadcast to Super Admin & Regional panels
    try {
      const { getIo } = require('../../lib/socket');
      const { broadcastAdminBadgeCounts } = require('../../lib/adminBadges');
      const io = getIo ? getIo() : null;
      if (io) {
        io.to('panel:admin').emit('admin:vendor_status_changed', {
          vendorId: vendor.id,
          approvalStatus,
          businessName: vendor.businessName,
        });
      }
      broadcastAdminBadgeCounts();
    } catch (e) {
      console.warn('[VendorApproval] Socket broadcast error:', e.message);
    }

    res.json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/admin/vendors/:id/commission — FR-05.10 */
router.patch('/:id/commission', restrictManage, async (req, res) => {
  try {
    const { commissionRate } = req.body;
    if (commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ error: 'commissionRate must be 0–100.' });
    }
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { commissionRate },
    });
    res.json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Admin-scoped Vendor Panel Routes ────────────────────────────────────────
// All routes below let admin manage any vendor's panel using the vendor's ID.

/** GET /api/admin/vendors/:id/overview — vendor dashboard stats */
router.get('/:id/overview', restrictView, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const [orders, vendor] = await Promise.all([
      prisma.order.findMany({
        where: { vendorId },
        select: { total: true, status: true, paymentStatus: true, createdAt: true, refundAmount: true },
      }),
      prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { walletBalance: true },
      }),
    ]);

    // Strictly exclude cancelled, refunded, returned, and failed orders from revenue and total order counts
    const terminalExcludedStatuses = ['cancelled', 'refunded', 'returned', 'failed'];
    const deliveredOrders = orders.filter(
      (o) =>
        (o.status === 'delivered' || o.status === 'confirmed' || o.status === 'processing' || o.status === 'shipped') &&
        !terminalExcludedStatuses.includes(o.status) &&
        o.paymentStatus !== 'refunded' &&
        o.paymentStatus !== 'failed'
    );

    const allTime = deliveredOrders.reduce(
      (acc, o) => ({
        total: Math.round((acc.total + (o.total || 0)) * 100) / 100,
        count: acc.count + 1,
      }),
      { total: 0, count: 0 }
    );

    const ordersByStatus = Object.entries(
      orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([_id, count]) => ({ _id, count }));

    res.json({ allTime, ordersByStatus, walletBalance: vendor?.walletBalance || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/vendors/:id/products — list vendor's products */
router.get('/:id/products', restrictView, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { vendorId: req.params.id },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ products });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/vendors/:id/products — add product for vendor */
router.post('/:id/products', restrictManage, async (req, res) => {
  try {
    const product = await prisma.product.create({
      data: { ...req.body, vendorId: req.params.id },
    });
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PUT /api/admin/vendors/:id/products/:pid — edit vendor's product */
router.put('/:id/products/:pid', restrictManage, async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.pid },
      data: req.body,
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** DELETE /api/admin/vendors/:id/products/:pid — delete vendor's product */
router.delete('/:id/products/:pid', restrictManage, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.pid } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/vendors/:id/orders — vendor's orders */
router.get('/:id/orders', restrictView, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { vendorId: req.params.id },
      include: {
        customer: { select: { name: true, email: true } },
        branch:   { select: { name: true } },
        items:    true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/admin/vendors/:id/orders/:oid/status — update order status */
router.patch('/:id/orders/:oid/status', restrictManage, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.oid },
      data: { status },
    });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/vendors/:id/wallet — wallet balance + transactions */
router.get('/:id/wallet', restrictView, async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    const paidOrders = await prisma.order.findMany({
      where: {
        vendorId,
        paymentStatus: 'paid',
        status: { notIn: ['cancelled', 'refunded', 'returned'] },
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        commission: true,
        createdAt: true,
      }
    });

    const withdrawals = await prisma.transaction.findMany({
      where: { userId: vendor.userId, type: 'withdrawal' },
      orderBy: { createdAt: 'desc' }
    });

    const transactions = [
      ...paidOrders.map(o => ({
        id: o.id,
        createdAt: o.createdAt,
        type: 'sale',
        amount: o.total - o.commission,
        status: 'paid',
        note: `Order ${o.orderNumber}`
      })),
      ...withdrawals.map(w => ({
        id: w.id,
        createdAt: w.createdAt,
        type: 'withdrawal',
        amount: -w.amount,
        status: w.status,
        note: `Withdrawal Request`
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ walletBalance: vendor.walletBalance, transactions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/vendors/:id/wallet/transactions/:tid/approve — approve withdrawal request */
router.post('/:id/wallet/transactions/:tid/approve', restrictManage, async (req, res) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.tid } });
    if (!tx || tx.type !== 'withdrawal') {
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }
    if (tx.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal is already processed.' });
    }

    const [updatedTx] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: req.params.tid },
        data: { status: 'paid' }
      }),
      prisma.vendor.update({
        where: { id: req.params.id },
        data: { walletBalance: { decrement: tx.amount } }
      })
    ]);

    res.json({ message: 'Withdrawal request approved.', transaction: updatedTx });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/vendors/:id/wallet/transactions/:tid/reject — reject withdrawal request */
router.post('/:id/wallet/transactions/:tid/reject', restrictManage, async (req, res) => {
  try {
    const tx = await prisma.transaction.findUnique({ where: { id: req.params.tid } });
    if (!tx || tx.type !== 'withdrawal') {
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }
    if (tx.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal is already processed.' });
    }

    const updatedTx = await prisma.transaction.update({
      where: { id: req.params.tid },
      data: { status: 'failed' }
    });

    res.json({ message: 'Withdrawal request rejected.', transaction: updatedTx });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/vendors/:id/technicians — vendor's technicians */
router.get('/:id/technicians', restrictView, async (req, res) => {
  try {
    const technicians = await prisma.technician.findMany({
      where: { vendorId: req.params.id },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);
    res.json({ technicians });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
