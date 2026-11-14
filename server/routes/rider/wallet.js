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
        payouts: { orderBy: { createdAt: 'desc' }, take: 15 },
      },
    });

    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    // Fetch primary PayoutRequests (which tracks real-time regional and super admin approvals/rejections)
    const payoutRequests = await prisma.payoutRequest.findMany({
      where: {
        partyType: 'RIDER',
        riderProfileId: profile.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    });

    // Format unified payout items for the rider panel
    let unifiedPayouts = [];
    if (payoutRequests.length > 0) {
      unifiedPayouts = payoutRequests.map(r => {
        let cleanReason = r.rejectionReason;
        if (!cleanReason && r.notes && r.notes.includes('Rejection')) {
          const parts = r.notes.split(']:');
          cleanReason = parts.length > 1 ? parts[1].trim() : r.notes;
        }

        const snapshot = r.bankSnapshot || {};
        let accDisplay = snapshot.upiId ? `UPI: ${snapshot.upiId}` : null;
        if (!accDisplay && snapshot.accountNumber) {
          accDisplay = `Bank A/c: ••••${String(snapshot.accountNumber).slice(-4)}`;
        }
        if (!accDisplay) {
          accDisplay = profile.upiId ? `UPI: ${profile.upiId}` : (profile.accountNumber ? `Bank A/c: ••••${profile.accountNumber.slice(-4)}` : 'Bank Transfer');
        }

        return {
          id: r.id,
          amount: r.amount,
          status: r.status, // pending, approved, under_review, completed, rejected
          bankAccountNumber: accDisplay,
          ifscCode: snapshot.ifsc || profile.ifsc || '',
          rejectionReason: cleanReason || null,
          notes: r.notes || null,
          createdAt: r.requestedAt || r.createdAt,
          processedAt: r.processedAt,
        };
      });
    } else {
      unifiedPayouts = (profile.payouts || []).map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        bankAccountNumber: p.bankAccountNumber,
        ifscCode: p.ifscCode,
        rejectionReason: p.referenceNumber,
        createdAt: p.createdAt,
      }));
    }

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
      payouts: unifiedPayouts,
      recentEarnings: recentDeliveries,
    });
  } catch (err) {
    console.error('Fetch wallet error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rider/wallet/payout-request
 * Submit bank or UPI withdrawal request
 */
router.post('/payout-request', async (req, res) => {
  try {
    const { amount, bankAccountNumber, ifscCode, upiId, method = 'bank' } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid withdrawal amount.' });
    }

    if (method === 'upi') {
      if (!upiId || !upiId.trim() || !upiId.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. mobile@upi or name@okaxis).' });
      }
    } else {
      if (!bankAccountNumber || !ifscCode) {
        return res.status(400).json({ error: 'Bank account number and IFSC code are required for bank transfer.' });
      }
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

    // NOTE: We do NOT decrement walletBalance here on request submission.
    // The wallet is only decremented when the Super Admin actually disburses (marks paid).
    // This prevents a double-decrement: request creates a "pending" hold tracked by
    // the payoutRequest record; the real debit happens in /api/admin/payouts/:id/complete.
    const [payout, payoutReq] = await prisma.$transaction([
      prisma.riderPayout.create({
        data: {
          riderProfileId: profile.id,
          amount: withdrawAmount,
          bankAccountNumber: method === 'upi' ? `UPI: ${upiId.trim()}` : bankAccountNumber.trim(),
          ifscCode: method === 'upi' ? 'UPI' : ifscCode.trim().toUpperCase(),
          status: 'pending',
        },
      }),
      prisma.payoutRequest.create({
        data: {
          partyType: 'RIDER',
          partyId: profile.id,
          riderProfileId: profile.id,
          amount: withdrawAmount,
          status: 'pending',
          bankSnapshot: {
            payoutMethod: method,
            accountHolder: profile.accountHolder,
            accountNumber: method === 'upi' ? null : (bankAccountNumber || profile.accountNumber),
            ifsc: method === 'upi' ? null : (ifscCode || profile.ifsc),
            bankName: profile.bankName,
            upiId: method === 'upi' ? upiId.trim() : (profile.upiId || null),
          },
        },
      }),
      // Save updated UPI/bank details to profile (but do NOT touch walletBalance here)
      prisma.riderProfile.update({
        where: { id: profile.id },
        data: {
          ...(method === 'upi' && upiId ? { upiId: upiId.trim() } : {}),
          ...(method === 'bank' && bankAccountNumber ? { accountNumber: bankAccountNumber.trim() } : {}),
          ...(method === 'bank' && ifscCode ? { ifsc: ifscCode.trim().toUpperCase() } : {}),
        },
      }),
    ]);

    try {
      const { notifyPayoutRequest } = require('../../lib/socket');
      notifyPayoutRequest({ ...payout, riderProfile: profile });
    } catch (_) {}

    res.json({
      success: true,
      message: `Withdrawal request for ₹${withdrawAmount} submitted via ${method === 'upi' ? 'UPI' : 'Bank'}! Funds will arrive within 24 hours.`,
      payout,
    });
  } catch (err) {
    console.error('Payout request error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
