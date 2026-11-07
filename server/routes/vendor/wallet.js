const express = require('express');
const prisma  = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('vendor'));

/** GET /api/vendor/wallet — Unified earnings dashboard with Vendor Net Model & real-time sync */
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

    // Fetch orders associated with this vendor (excluding deleted or cancelled orders)
    const orders = await prisma.order.findMany({
      where: {
        vendorId: req.user.vendorId,
        status: { notIn: ['cancelled', 'refunded'] },
        ...(hasDateFilter ? { createdAt: dateFilter } : {})
      },
      include: {
        items: {
          select: { price: true, quantity: true, basePrice: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Unified withdrawals from PayoutRequest (Single source of truth shared with Super Admin)
    const withdrawals = await prisma.payoutRequest.findMany({
      where: {
        partyType: 'VENDOR',
        partyId: req.user.vendorId,
        ...(hasDateFilter ? { requestedAt: dateFilter } : {})
      },
      orderBy: { requestedAt: 'desc' }
    });

    // Calculate Vendor Net earnings (100% of vendor item prices; zero commission cut)
    let grossRevenue = 0;
    const paidOrders = orders.filter(o => o.status === 'delivered');
    const orderCount = paidOrders.length;

    const saleTransactions = orders.map(o => {
      const vendorItemsTotal = o.items?.reduce(
        (sum, it) => sum + ((it.price || it.basePrice || 0) * (it.quantity || 1)),
        0
      ) || (o.total || 0);

      if (o.status === 'delivered') {
        grossRevenue += vendorItemsTotal;
      }

      return {
        id: o.id,
        createdAt: o.createdAt,
        type: 'sale',
        amount: Math.round(vendorItemsTotal * 100) / 100,
        status: o.status === 'delivered' ? 'paid' : 'pending',
        note: `Order #${o.orderNumber || o.id.slice(0, 8)} (${o.status === 'delivered' ? 'Delivered' : o.status})`
      };
    });

    const withdrawalTransactions = withdrawals.map(w => ({
      id: w.id,
      createdAt: w.requestedAt,
      type: 'withdrawal',
      amount: -Math.abs(w.amount),
      status: w.status === 'completed' ? 'paid' : (w.status === 'rejected' ? 'rejected' : 'pending'),
      note: w.notes ? w.notes.split('\n')[0] : `Payout Request (${w.status})`
    }));

    const transactions = [...saleTransactions, ...withdrawalTransactions].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Pending payouts currently awaiting Super Admin review/disbursement
    const pendingPayoutsAgg = await prisma.payoutRequest.aggregate({
      where: {
        partyType: 'VENDOR',
        partyId: req.user.vendorId,
        status: { in: ['pending', 'approved'] }
      },
      _sum: { amount: true }
    });
    const pendingSum = pendingPayoutsAgg._sum.amount || 0;

    const rawBalance = Math.max(0, vendor.walletBalance || 0);
    const availableBalance = Math.max(0, rawBalance - pendingSum);

    // All-time delivered product gross
    const allDeliveredOrders = await prisma.order.findMany({
      where: {
        vendorId: req.user.vendorId,
        status: 'delivered'
      },
      include: {
        items: { select: { price: true, quantity: true, basePrice: true } }
      }
    });

    const allTimeGross = allDeliveredOrders.reduce((sum, o) => {
      const itTot = o.items?.reduce((s, it) => s + ((it.price || it.basePrice || 0) * (it.quantity || 1)), 0) || (o.total || 0);
      return sum + itTot;
    }, 0);

    res.json({
      walletBalance: rawBalance,
      availableBalance,
      pendingPayouts: pendingSum,
      commissionRate: 0, // 0% deduction under Vendor Net Protection Model
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      totalCommission: 0,
      netEarnings: Math.round(grossRevenue * 100) / 100,
      orderCount,
      allTimeGross: Math.round(allTimeGross * 100) / 100,
      allTimeCommission: 0,
      transactions,
      bankDetails: {
        accountHolder: vendor.accountHolder,
        accountNumber: vendor.accountNumber,
        ifsc: vendor.ifsc,
        bankName: vendor.bankName,
        upiId: vendor.upiId,
      },
    });
  } catch (err) {
    console.error('[VendorWallet] GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/vendor/wallet/transactions — recent delivered orders */
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const where = { vendorId: req.user.vendorId, status: 'delivered' };
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
    const withdrawAmt = parseFloat(amount);
    const vendor = await prisma.vendor.findUnique({ where: { id: req.user.vendorId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    const pendingPayoutsAgg = await prisma.payoutRequest.aggregate({
      where: {
        partyType: 'VENDOR',
        partyId: vendor.id,
        status: { in: ['pending', 'approved'] }
      },
      _sum: { amount: true }
    });
    const pendingSum = pendingPayoutsAgg._sum.amount || 0;
    const available = Math.max(0, (vendor.walletBalance || 0) - pendingSum);

    if (isNaN(withdrawAmt) || withdrawAmt <= 0 || withdrawAmt > available) {
      return res.status(400).json({
        error: `Invalid withdrawal amount or insufficient available balance (Available: ₹${available}).`
      });
    }

    const payoutReq = await prisma.payoutRequest.create({
      data: {
        partyType: 'VENDOR',
        partyId: vendor.id,
        vendorId: vendor.id,
        amount: withdrawAmt,
        status: 'pending',
        bankSnapshot: {
          accountHolder: vendor.accountHolder,
          accountNumber: vendor.accountNumber,
          ifsc: vendor.ifsc,
          bankName: vendor.bankName,
          upiId: vendor.upiId,
        },
      }
    });

    res.json({
      success: true,
      message: 'Withdrawal request submitted for approval.',
      walletBalance: vendor.walletBalance,
      payoutRequestId: payoutReq.id
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** PATCH /api/vendor/wallet/bank-details — update bank account & UPI */
router.patch('/bank-details', async (req, res) => {
  try {
    const { accountHolder, accountNumber, ifsc, bankName, upiId } = req.body;
    const updateData = {};
    if (accountHolder !== undefined) updateData.accountHolder = accountHolder?.trim() || null;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber?.trim() || null;
    if (ifsc !== undefined) updateData.ifsc = ifsc?.trim().toUpperCase() || null;
    if (bankName !== undefined) updateData.bankName = bankName?.trim() || null;
    if (upiId !== undefined) updateData.upiId = upiId?.trim().toLowerCase() || null;

    const vendor = await prisma.vendor.update({
      where: { id: req.user.vendorId },
      data: updateData,
    });

    // Auto-sync any open pending payout requests with the updated bank / UPI snapshot
    await prisma.payoutRequest.updateMany({
      where: {
        partyType: 'VENDOR',
        partyId: req.user.vendorId,
        status: 'pending'
      },
      data: {
        bankSnapshot: {
          accountHolder: vendor.accountHolder,
          accountNumber: vendor.accountNumber,
          ifsc: vendor.ifsc,
          bankName: vendor.bankName,
          upiId: vendor.upiId
        }
      }
    }).catch(err => console.warn('[VendorWallet] Payout requests bank sync warning:', err.message));

    res.json({
      bankDetails: {
        accountHolder: vendor.accountHolder,
        accountNumber: vendor.accountNumber,
        ifsc: vendor.ifsc,
        bankName: vendor.bankName,
        upiId: vendor.upiId
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
