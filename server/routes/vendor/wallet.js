const express = require('express');
const prisma  = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('vendor'));

/** GET /api/vendor/wallet — FR-02.5: Earnings dashboard with optional date filtering */
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;

    const vendor = await prisma.vendor.findUnique({
      where: { id: req.user.vendorId },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    // Date range filter
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }
    const hasDateFilter = Boolean(from || to);

    const earnings = await prisma.order.aggregate({
      where: {
        vendorId: req.user.vendorId,
        paymentStatus: 'paid',
        ...(hasDateFilter ? { createdAt: dateFilter } : {})
      },
      _sum: { total: true, commission: true },
      _count: { id: true },
    });

    const grossRevenue = earnings._sum.total || 0;
    const totalCommission = earnings._sum.commission || 0;

    const paidOrders = await prisma.order.findMany({
      where: {
        vendorId: req.user.vendorId,
        paymentStatus: 'paid',
        ...(hasDateFilter ? { createdAt: dateFilter } : {})
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        commission: true,
        createdAt: true,
        status: true,
      }
    });

    const withdrawals = await prisma.transaction.findMany({
      where: {
        userId: vendor.userId,
        type: 'withdrawal',
        ...(hasDateFilter ? { createdAt: dateFilter } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    const transactions = [
      ...paidOrders.map(o => ({
        id: o.id,
        createdAt: o.createdAt,
        type: 'sale',
        amount: Math.round(((o.total || 0) - (o.commission || 0)) * 100) / 100,
        status: o.status === 'delivered' ? 'paid' : (o.paymentStatus || 'paid'),
        note: `Order ${o.orderNumber}`
      })),
      ...withdrawals.map(w => ({
        id: w.id,
        createdAt: w.createdAt,
        type: 'withdrawal',
        amount: -Math.abs(w.amount),
        status: w.status,
        note: `Withdrawal Request`
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Also get all-time earnings for the persistent summary card
    const allTimeEarnings = await prisma.order.aggregate({
      where: { vendorId: req.user.vendorId, paymentStatus: 'paid' },
      _sum: { total: true, commission: true },
      _count: { id: true }
    });

    res.json({
      walletBalance:   vendor.walletBalance,
      commissionRate:  vendor.commissionRate,
      grossRevenue,
      totalCommission,
      netEarnings:     grossRevenue - totalCommission,
      orderCount:      earnings._count.id || 0,
      allTimeGross:    allTimeEarnings._sum.total || 0,
      allTimeCommission: allTimeEarnings._sum.commission || 0,
      transactions,
      bankDetails: {
        accountHolder: vendor.accountHolder,
        accountNumber: vendor.accountNumber,
        ifsc: vendor.ifsc,
        bankName: vendor.bankName,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/vendor/wallet/transactions — recent paid orders as ledger */
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const where = { vendorId: req.user.vendorId, paymentStatus: 'paid' };
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [transactions, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          commission: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ transactions, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/vendor/wallet/withdraw — request withdrawal */
router.post('/withdraw', async (req, res) => {
  try {
    const { amount } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { id: req.user.vendorId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    const pendingWithdrawals = await prisma.transaction.aggregate({
      where: { userId: vendor.userId, type: 'withdrawal', status: 'pending' },
      _sum: { amount: true }
    });
    const pendingSum = pendingWithdrawals._sum.amount || 0;
    const available = vendor.walletBalance - pendingSum;

    if (amount <= 0 || amount > available) {
      return res.status(400).json({ error: 'Invalid withdrawal amount or insufficient available balance.' });
    }

    const [tx, payoutReq] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: vendor.userId,
          type: 'withdrawal',
          amount: parseFloat(amount),
          status: 'pending',
          gatewayRef: 'withdrawal_request'
        }
      }),
      prisma.payoutRequest.create({
        data: {
          partyType: 'VENDOR',
          partyId: vendor.id,
          vendorId: vendor.id,
          amount: parseFloat(amount),
          status: 'pending',
          bankSnapshot: {
            accountHolder: vendor.accountHolder,
            accountNumber: vendor.accountNumber,
            ifsc: vendor.ifsc,
            bankName: vendor.bankName,
            upiId: vendor.upiId,
          },
        }
      })
    ]);

    res.json({
      message: 'Withdrawal request submitted for approval.',
      walletBalance: vendor.walletBalance,
      payoutRequestId: payoutReq.id
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/vendor/wallet/bank-details — update bank account */
router.patch('/bank-details', async (req, res) => {
  try {
    const { accountHolder, accountNumber, ifsc, bankName } = req.body;
    const vendor = await prisma.vendor.update({
      where: { id: req.user.vendorId },
      data: { accountHolder, accountNumber, ifsc, bankName },
    });
    res.json({
      bankDetails: {
        accountHolder: vendor.accountHolder,
        accountNumber: vendor.accountNumber,
        ifsc: vendor.ifsc,
        bankName: vendor.bankName,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
