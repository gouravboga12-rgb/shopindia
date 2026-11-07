const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }      = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requirePermission('manage_commissions'));

/** GET /api/admin/commissions — list all vendor commission rates */
router.get('/', async (_req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { approvalStatus: 'approved' },
      select: {
        id: true,
        businessName: true,
        commissionRate: true,
        walletBalance: true,
        approvalStatus: true,
      },
      orderBy: { businessName: 'asc' },
    });
    res.json(vendors);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/admin/commissions/:vendorId — update vendor commission rate */
router.patch('/:vendorId', async (req, res) => {
  try {
    const { commissionRate } = req.body;
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ error: 'commissionRate must be a number 0–100.' });
    }
    const vendor = await prisma.vendor.update({
      where: { id: req.params.vendorId },
      data: { commissionRate },
      select: { id: true, businessName: true, commissionRate: true },
    });
    res.json(vendor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/commissions/summary — revenue breakdown */
router.get('/summary', async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: 'paid',
        status: { notIn: ['cancelled', 'refunded', 'returned'] },
      },
      include: { vendor: { select: { businessName: true } } },
    });

    const summaryMap = {};
    orders.forEach((o) => {
      const vId = o.vendorId || 'unassigned';
      const bName = o.vendor ? o.vendor.businessName : 'Unassigned';
      if (!summaryMap[vId]) {
        summaryMap[vId] = {
          _id: vId,
          businessName: bName,
          totalRevenue: 0,
          totalCommission: 0,
          orderCount: 0,
        };
      }
      summaryMap[vId].totalRevenue += (o.total || 0);
      summaryMap[vId].totalCommission += (o.commission || 0);
      summaryMap[vId].orderCount += 1;
    });

    const summary = Object.values(summaryMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
