const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('rider'));

/**
 * GET /api/rider/wallet
 * Balance, total earnings, payout requests
 */
router.get('/', async (req, res) => {
  try {
    const profile = await prisma.riderProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        payouts: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    // Recent deliveries credited
    const recentDeliveries = await prisma.delivery.findMany({
      where: { riderProfileId: profile.id, status: 'delivered' },
      select: {
        id: true,
        deliveryFee: true,
        deliveredAt: true,
        pickupName: true,
        dropoffName: true,
      },
      orderBy: { deliveredAt: 'desc' },
      take: 10,
    });

    res.json({
      walletBalance: profile.walletBalance,
      totalDeliveries: profile.totalDeliveries,
      payouts: profile.payouts,
      recentEarnings: recentDeliveries,
    });
  } catch (err) {
    console.error('Fetch wallet error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/wallet/payout-request
 * Submit bank withdrawal request
 */
router.post('/payout-request', async (req, res) => {
  try {
    const { amount, bankAccountNumber, ifscCode } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid withdrawal amount.' });
    }

    const profile = await prisma.riderProfile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    if (profile.walletBalance < withdrawAmount) {
      return res.status(400).json({
        error: `Insufficient wallet balance. Available: ₹${profile.walletBalance}`,
      });
    }

    const [payout] = await prisma.$transaction([
      prisma.riderPayout.create({
        data: {
          riderProfileId: profile.id,
          amount: withdrawAmount,
          bankAccountNumber,
          ifscCode,
          status: 'pending',
        },
      }),
      prisma.riderProfile.update({
        where: { id: profile.id },
        data: { walletBalance: { decrement: withdrawAmount } },
      }),
    ]);

    res.json({
      success: true,
      message: `Withdrawal request for ₹${withdrawAmount} submitted! Funds will reflect in 24 hours.`,
      payout,
    });
  } catch (err) {
    console.error('Payout request error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
