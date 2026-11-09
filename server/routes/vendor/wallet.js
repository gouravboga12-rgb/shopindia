'use strict';
/**
 * server/routes/vendor/wallet.js
 * Comprehensive Vendor Wallet, Outstanding Balance ("Pending from Shop India"),
 * Cleared Bank Settlements, Month-wise Filter, and Itemized Ledgers.
 */

const express = require('express');
const prisma  = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('vendor'));

/**
 * GET /api/vendor/wallet
 * Returns:
 *  - pendingFromShopIndia: Delivered orders awaiting payout
 *  - totalClearedByAdmin: All-time payouts successfully transferred to bank/UPI
 *  - periodPending: Pending amount in selected month/range
 *  - periodCleared: Cleared amount in selected month/range
 *  - payouts: List of Super Admin payouts with UTR & Payment Mode
 *  - ordersLedger: Itemized delivered orders with customer & product details
 *  - bankDetails: Verified merchant bank & UPI accounts
 */
router.get('/', async (req, res) => {
  try {
    const { from, to, period } = req.query;
    const vendorId = req.user.vendorId;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    // Date range filter resolution
    let dateFilter = {};
    if (from || to) {
      if (from) dateFilter.gte = new Date(from);
      if (to) {
        const toD = new Date(to);
        toD.setHours(23, 59, 59, 999);
        dateFilter.lte = toD;
      }
    } else if (period === 'this_month') {
      const now = new Date();
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'last_month') {
      const now = new Date();
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }
    const hasDateFilter = Boolean(dateFilter.gte || dateFilter.lte);

    // 1. Fetch ALL delivered orders for this vendor (Strictly delivered; no cancelled/refunded)
    const allDeliveredOrders = await prisma.order.findMany({
      where: {
        vendorId,
        status: 'delivered',
      },
      include: {
        customer: { select: { name: true, phone: true } },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            vendorPrice: true,
            productId: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch ALL payout requests for this vendor
    const allPayouts = await prisma.payoutRequest.findMany({
      where: {
        partyType: 'VENDOR',
        partyId: vendorId,
      },
      orderBy: { requestedAt: 'desc' }
    });

    // Calculate all-time earned from delivered items (Vendor Net: 100% of vendor item price)
    let allTimeEarned = 0;
    const formattedOrders = allDeliveredOrders.map(o => {
      const orderTotal = o.items.reduce((sum, it) => {
        const itemVal = (it.vendorPrice != null ? it.vendorPrice : (it.price || 0)) * (it.quantity || 1);
        return sum + itemVal;
      }, 0);

      allTimeEarned += orderTotal;

      return {
        id: o.id,
        orderNumber: o.orderNumber || o.id.slice(0, 8),
        date: o.createdAt,
        customerName: o.customer?.name || 'Customer',
        customerPhone: o.customer?.phone || '',
        items: o.items.map(it => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.vendorPrice != null ? it.vendorPrice : it.price,
          totalPrice: (it.vendorPrice != null ? it.vendorPrice : it.price) * it.quantity,
        })),
        totalDue: Math.round(orderTotal * 100) / 100,
      };
    });

    // Calculate all-time cleared payouts by Super Admin
    let allTimeCleared = 0;
    let pendingPayoutsSum = 0;

    const formattedPayouts = allPayouts.map(p => {
      if (p.status === 'completed') {
        allTimeCleared += p.amount;
      } else if (p.status === 'pending' || p.status === 'approved') {
        pendingPayoutsSum += p.amount;
      }

      // Extract payment mode & clean UTR
      let paymentMode = 'Bank Transfer';
      const notesLower = (p.notes || '').toLowerCase();
      if (notesLower.includes('upi') || (p.bankSnapshot && p.bankSnapshot.upiId)) {
        paymentMode = 'UPI Transfer';
      }

      // Clean UTR
      let utr = p.razorpayPayoutId || '';
      if (!utr && p.notes) {
        const utrMatch = p.notes.match(/UTR[:\s]+([A-Za-z0-9_-]+)/i);
        if (utrMatch) utr = utrMatch[1];
      }

      return {
        id: p.id,
        payoutRef: 'PO-' + p.id.slice(0, 8).toUpperCase(),
        date: p.processedAt || p.requestedAt,
        amount: p.amount,
        status: p.status, // pending, approved, completed, rejected
        paymentMode,
        utr: utr || null,
        notes: p.notes || '',
        settledDetails: p.bankSnapshot || {
          bankName: vendor.bankName,
          accountNumber: vendor.accountNumber,
          upiId: vendor.upiId,
        }
      };
    });

    // Pending from Shop India = All delivered sales minus all completed payouts
    const pendingFromShopIndia = Math.max(0, Math.round((allTimeEarned - allTimeCleared) * 100) / 100);

    // Link orders with payout status
    let remainingClearedPool = allTimeCleared;
    // Walk from oldest to newest delivered order to stamp which orders are paid vs pending
    const ordersWithSettlement = [...formattedOrders].reverse().map(ord => {
      let isPaid = false;
      if (remainingClearedPool >= ord.totalDue && ord.totalDue > 0) {
        isPaid = true;
        remainingClearedPool -= ord.totalDue;
      }
      return {
        ...ord,
        settlementStatus: isPaid ? 'cleared' : 'pending_from_shopindia',
      };
    }).reverse();

    // Calculate period-specific metrics if filter applied
    let periodEarned = 0;
    let periodCleared = 0;

    ordersWithSettlement.forEach(o => {
      const oDate = new Date(o.date);
      let inRange = true;
      if (dateFilter.gte && oDate < dateFilter.gte) inRange = false;
      if (dateFilter.lte && oDate > dateFilter.lte) inRange = false;
      if (inRange) {
        periodEarned += o.totalDue;
      }
    });

    formattedPayouts.forEach(p => {
      const pDate = new Date(p.date);
      let inRange = true;
      if (dateFilter.gte && pDate < dateFilter.gte) inRange = false;
      if (dateFilter.lte && pDate > dateFilter.lte) inRange = false;
      if (inRange && p.status === 'completed') {
        periodCleared += p.amount;
      }
    });

    res.json({
      success: true,
      pendingFromShopIndia,
      totalClearedByAdmin: Math.round(allTimeCleared * 100) / 100,
      totalDeliveredEarnings: Math.round(allTimeEarned * 100) / 100,
      pendingPayoutsSum: Math.round(pendingPayoutsSum * 100) / 100,
      periodStats: {
        periodEarned: Math.round(periodEarned * 100) / 100,
        periodCleared: Math.round(periodCleared * 100) / 100,
        periodPending: Math.max(0, Math.round((periodEarned - periodCleared) * 100) / 100),
      },
      payouts: formattedPayouts,
      ordersLedger: ordersWithSettlement,
      bankDetails: {
        accountHolder: vendor.accountHolder,
        accountNumber: vendor.accountNumber,
        ifsc: vendor.ifsc,
        bankName: vendor.bankName,
        upiId: vendor.upiId,
      },
      vendorInfo: {
        id: vendor.id,
        businessName: vendor.businessName,
        phone: vendor.phone,
      }
    });
  } catch (err) {
    console.error('[VendorWallet] GET error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch vendor wallet data.' });
  }
});

/**
 * POST /api/vendor/wallet/withdraw
 * Merchant requests a payout withdrawal of their pending balance
 */
router.post('/withdraw', async (req, res) => {
  try {
    const { amount } = req.body;
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount is required.' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: req.user.vendorId },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    // Calculate pending from Shop India
    const allDeliveredOrders = await prisma.order.findMany({
      where: { vendorId: vendor.id, status: 'delivered' },
      include: { items: true }
    });
    const allPayouts = await prisma.payoutRequest.findMany({
      where: { partyType: 'VENDOR', partyId: vendor.id }
    });

    const totalEarned = allDeliveredOrders.reduce((sum, o) => {
      const itTot = o.items.reduce((s, it) => s + ((it.vendorPrice != null ? it.vendorPrice : (it.price || 0)) * it.quantity), 0);
      return sum + itTot;
    }, 0);

    const totalCleared = allPayouts
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPendingPayouts = allPayouts
      .filter(p => p.status === 'pending' || p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);

    const availableForWithdrawal = Math.max(0, totalEarned - totalCleared - totalPendingPayouts);

    if (withdrawAmount > availableForWithdrawal) {
      return res.status(400).json({
        error: `Cannot request ₹${withdrawAmount.toLocaleString('en-IN')}. Maximum available pending clearance is ₹${availableForWithdrawal.toLocaleString('en-IN')}.`
      });
    }

    const bankSnapshot = {
      bankName: vendor.bankName,
      accountNumber: vendor.accountNumber,
      accountHolder: vendor.accountHolder,
      ifsc: vendor.ifsc,
      upiId: vendor.upiId,
    };

    const payout = await prisma.payoutRequest.create({
      data: {
        partyType: 'VENDOR',
        partyId: vendor.id,
        vendorId: vendor.id,
        amount: withdrawAmount,
        status: 'pending',
        bankSnapshot,
        notes: `Vendor requested payout of ₹${withdrawAmount}`,
      }
    });

    try {
      const { notifyPayoutRequest } = require('../../lib/socket');
      notifyPayoutRequest({ ...payout, vendor });
    } catch (_) {}

    res.json({
      success: true,
      message: `Payout request for ₹${withdrawAmount.toLocaleString('en-IN')} submitted to Shop India.`,
      payout,
    });
  } catch (err) {
    console.error('[VendorWallet] withdraw error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit withdrawal request.' });
  }
});

/**
 * PATCH /api/vendor/wallet/bank-details
 */
router.patch('/bank-details', async (req, res) => {
  try {
    const { bankName, accountHolder, accountNumber, ifsc, upiId } = req.body;
    const vendor = await prisma.vendor.update({
      where: { id: req.user.vendorId },
      data: {
        bankName: bankName !== undefined ? bankName : undefined,
        accountHolder: accountHolder !== undefined ? accountHolder : undefined,
        accountNumber: accountNumber !== undefined ? accountNumber : undefined,
        ifsc: ifsc !== undefined ? ifsc : undefined,
        upiId: upiId !== undefined ? upiId : undefined,
      }
    });
    res.json({ success: true, message: 'Bank details updated successfully.', vendor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
