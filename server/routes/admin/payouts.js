'use strict';
/**
 * server/routes/admin/payouts.js
 * Unified 3-Queue Partner Payout Center, Accounts Directory,
 * Account Passbook Statements, and Audited Manual Adjustments.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { postLedgerEntries } = require('../../lib/ledger');

router.use(verifyToken, requireRole('super_admin', 'regional_admin'));

/**
 * GET /api/admin/payouts
 * 3-Queue Payout Requests Review (Vendor, Rider, Technician)
 */
router.get('/', async (req, res) => {
  try {
    const { queue = 'all', status, role, startDate, endDate, page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    if (queue === 'vendor') {
      where.partyType = 'VENDOR';
    } else if (queue === 'rider' || queue === 'technician' || queue === 'fleet') {
      where.partyType = 'RIDER';
    }

    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) where.requestedAt.gte = new Date(startDate);
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        where.requestedAt.lte = endD;
      }
    }

    const [requests, total, queueStats] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              contactName: true,
              phone: true,
              email: true,
              street: true,
              city: true,
              state: true,
              pincode: true,
              gstNumber: true,
              panNumber: true,
              walletBalance: true,
              accountHolder: true,
              accountNumber: true,
              ifsc: true,
              bankName: true,
              upiId: true,
              approvalStatus: true,
              isActive: true,
              documents: { select: { id: true, name: true, url: true } },
              user: {
                select: { id: true, status: true, phone: true, email: true },
              },
            },
          },
          riderProfile: {
            include: {
              user: { select: { id: true, name: true, phone: true, email: true, status: true } },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.payoutRequest.count({ where }),
      // Aggregate stats per status within the active filter
      prisma.payoutRequest.groupBy({
        by: ['status'],
        where: queue === 'vendor' ? { partyType: 'VENDOR' } : queue === 'fleet' || queue === 'rider' || queue === 'technician' ? { partyType: 'RIDER' } : {},
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const stats = {
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      completedCount: 0,
      completedAmount: 0,
    };

    queueStats.forEach(s => {
      if (s.status === 'pending') {
        stats.pendingCount = s._count.id;
        stats.pendingAmount = s._sum.amount || 0;
      } else if (s.status === 'approved' || s.status === 'under_review') {
        stats.approvedCount += s._count.id;
        stats.approvedAmount += s._sum.amount || 0;
      } else if (s.status === 'completed') {
        stats.completedCount = s._count.id;
        stats.completedAmount = s._sum.amount || 0;
      }
    });

    res.json({
      success: true,
      requests,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      stats,
    });
  } catch (err) {
    console.error('[AdminPayouts] GET error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch payout requests.' });
  }
});

/**
 * POST /api/admin/payouts/:id/approve
 * Super Admin approves / verifies a pending payout request
 */
router.post('/:id/approve', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Payout request not found.' });

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Payout is already completed.' });
    }

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        notes: notes ? `${request.notes || ''}\n[Approved]: ${notes}`.trim() : request.notes,
      },
    });

    res.json({ success: true, message: 'Payout request approved for execution.', payout: updated });
  } catch (err) {
    console.error('[AdminPayouts] Approve error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/payouts/:id/complete
 * Super Admin records successful disbursement (IMPS/UPI) with UTR.
 * Automatically posts immutable LedgerEntry DEBIT and updates wallet balance.
 */
router.post('/:id/complete', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { utr, razorpayPayoutId, utrNumber, paymentMode, notes } = req.body;
    const finalUtr = (utr || razorpayPayoutId || utrNumber || '').trim();
    const finalMode = (paymentMode || 'UPI Transfer').trim();

    const request = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Payout request not found.' });

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'This payout has already been marked as completed.' });
    }

    const noteText = `[Mode: ${finalMode}]${finalUtr ? ` [UTR: ${finalUtr}]` : ''}${notes ? ` - ${notes}` : ''}`;

    // Execute in database transaction:
    // 1. Mark request completed (UTR is stored in razorpayPayoutId)
    // 2. Decrement partner walletBalance
    // 3. Post immutable LedgerEntry (PAYOUT DEBIT)
    const result = await prisma.$transaction(async (tx) => {
      const completedRequest = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          razorpayPayoutId: finalUtr || null,
          notes: request.notes ? `${request.notes}\n${noteText}` : noteText,
        },
      });

      // Update wallet and ledger based on partyType
      if (request.partyType === 'VENDOR' && request.vendorId) {
        await tx.vendor.update({
          where: { id: request.vendorId },
          data: { walletBalance: { decrement: request.amount } },
        });

        await tx.ledgerEntry.create({
          data: {
            type: 'DEBIT',
            party: 'VENDOR',
            partyId: request.vendorId,
            vendorId: request.vendorId,
            amount: request.amount,
            entryType: 'PAYOUT',
            description: `Merchant Payout #${completedRequest.id.slice(0, 8)} (${finalMode}${finalUtr ? ` UTR: ${finalUtr}` : ''})`,
            metadata: JSON.stringify({ payoutId: completedRequest.id, utr: finalUtr, paymentMode: finalMode }),
          },
        });
      } else if (request.partyType === 'RIDER' && request.riderProfileId) {
        await tx.riderProfile.update({
          where: { id: request.riderProfileId },
          data: { walletBalance: { decrement: request.amount } },
        });

        await tx.ledgerEntry.create({
          data: {
            type: 'DEBIT',
            party: 'RIDER',
            partyId: request.riderProfileId,
            riderProfileId: request.riderProfileId,
            amount: request.amount,
            entryType: 'PAYOUT',
            description: finalUtr ? `Rider/Technician Payout Disbursed — UTR: ${finalUtr}` : 'Rider/Technician Payout Disbursed — Super Admin Clearance',
            metadata: JSON.stringify({ payoutId: completedRequest.id, utr: finalUtr, paymentMode: finalMode }),
          },
        });

        await tx.riderPayout.updateMany({
          where: {
            riderProfileId: request.riderProfileId,
            amount: request.amount,
            status: 'pending',
          },
          data: { status: 'completed' },
        });
      }

      return completedRequest;
    });

    res.json({
      success: true,
      message: `Payout of ₹${request.amount.toLocaleString('en-IN')} marked as completed via ${finalMode}${finalUtr ? ` (UTR: ${finalUtr})` : ''}.`,
      payout: result,
    });
  } catch (err) {
    console.error('[AdminPayouts] Complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/payouts/vendor/:vendorId/ledger
 * Complete statement of accounts for a specific vendor (Delivered orders, paid vs unpaid, customer details)
 */
router.get('/vendor/:vendorId/ledger', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { user: { select: { name: true, phone: true, email: true } } }
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });

    // 1. Fetch delivered orders strictly
    const deliveredOrders = await prisma.order.findMany({
      where: {
        vendorId,
        status: 'delivered',
      },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            vendorPrice: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch all payout requests for this vendor
    const payouts = await prisma.payoutRequest.findMany({
      where: { partyType: 'VENDOR', partyId: vendorId },
      orderBy: { requestedAt: 'desc' }
    });

    let totalEarned = 0;
    const ordersList = deliveredOrders.map(o => {
      const orderTotal = o.items.reduce((sum, it) => {
        const itemVal = (it.vendorPrice != null ? it.vendorPrice : (it.price || 0)) * (it.quantity || 1);
        return sum + itemVal;
      }, 0);
      totalEarned += orderTotal;

      return {
        id: o.id,
        orderNumber: o.orderNumber || o.id.slice(0, 8),
        date: o.createdAt,
        customerName: o.customer?.name || 'Customer',
        customerPhone: o.customer?.phone || '',
        customerEmail: o.customer?.email || '',
        items: o.items.map(it => ({
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.vendorPrice != null ? it.vendorPrice : it.price,
          totalPrice: (it.vendorPrice != null ? it.vendorPrice : it.price) * it.quantity,
        })),
        totalDue: Math.round(orderTotal * 100) / 100,
      };
    });

    let totalCleared = 0;
    let pendingPayoutsSum = 0;

    const formattedPayouts = payouts.map(p => {
      if (p.status === 'completed') totalCleared += p.amount;
      if (p.status === 'pending' || p.status === 'approved') pendingPayoutsSum += p.amount;

      let paymentMode = 'Bank Transfer';
      const nLower = (p.notes || '').toLowerCase();
      if (nLower.includes('upi') || (p.bankSnapshot && p.bankSnapshot.upiId)) paymentMode = 'UPI Transfer';

      let utr = p.razorpayPayoutId || '';
      if (!utr && p.notes) {
        const m = p.notes.match(/UTR[:\s]+([A-Za-z0-9_-]+)/i);
        if (m) utr = m[1];
      }

      return {
        id: p.id,
        payoutRef: 'PO-' + p.id.slice(0, 8).toUpperCase(),
        date: p.processedAt || p.requestedAt,
        amount: p.amount,
        status: p.status,
        paymentMode,
        utr: utr || null,
        notes: p.notes || '',
        bankSnapshot: p.bankSnapshot,
      };
    });

    const pendingBalance = Math.max(0, Math.round((totalEarned - totalCleared) * 100) / 100);

    // Stamp which orders are cleared vs pending
    let pool = totalCleared;
    const ordersWithStatus = [...ordersList].reverse().map(ord => {
      let isPaid = false;
      if (pool >= ord.totalDue && ord.totalDue > 0) {
        isPaid = true;
        pool -= ord.totalDue;
      }
      return {
        ...ord,
        isPaid,
        status: isPaid ? 'cleared' : 'pending_from_shopindia',
      };
    }).reverse();

    res.json({
      success: true,
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        contactName: vendor.contactName,
        phone: vendor.phone,
        email: vendor.email,
        upiId: vendor.upiId,
        accountHolder: vendor.accountHolder,
        accountNumber: vendor.accountNumber,
        ifsc: vendor.ifsc,
        bankName: vendor.bankName,
      },
      summary: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalCleared: Math.round(totalCleared * 100) / 100,
        pendingBalance,
        pendingPayoutsSum: Math.round(pendingPayoutsSum * 100) / 100,
      },
      orders: ordersWithStatus,
      payouts: formattedPayouts,
    });
  } catch (err) {
    console.error('[AdminPayouts] Vendor ledger error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/payouts/:id/reject
 * Reject a payout request with reason
 */
router.post('/:id/reject', requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    const request = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Payout request not found.' });

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'Cannot reject an already completed payout.' });
    }

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
      },
    });

    res.json({ success: true, message: 'Payout request rejected.', payout: updated });
  } catch (err) {
    console.error('[AdminPayouts] Reject error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/payouts/accounts
 * Directory of all Partner Accounts (Vendors & Riders/Technicians)
 */
router.get('/accounts', async (req, res) => {
  try {
    const { type = 'all', search, dateRange, startDate, endDate } = req.query;

    let dateFilter = undefined;
    if (dateRange === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      dateFilter = { gte: start };
    } else if (dateRange === 'yesterday') {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    } else if (dateRange === '7d') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      dateFilter = { gte: start };
    } else if (dateRange === '30d') {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      dateFilter = { gte: start };
    } else if (dateRange === 'custom' && (startDate || endDate)) {
      dateFilter = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    const vendorWhere = {};
    if (search) {
      vendorWhere.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFilter) {
      vendorWhere.createdAt = dateFilter;
    }

    const riderWhere = {};
    if (search) {
      riderWhere.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFilter) {
      riderWhere.createdAt = dateFilter;
    }

    const [vendors, riders] = await Promise.all([
      type === 'rider' ? [] : prisma.vendor.findMany({
        where: vendorWhere,
        select: {
          id: true,
          businessName: true,
          contactName: true,
          email: true,
          phone: true,
          city: true,
          walletBalance: true,
          commissionRate: true,
          accountHolder: true,
          accountNumber: true,
          ifsc: true,
          bankName: true,
          upiId: true,
          approvalStatus: true,
          createdAt: true,
          _count: { select: { orders: true, payoutRequests: true } },
        },
        orderBy: { walletBalance: 'desc' },
      }),

      type === 'vendor' ? [] : prisma.riderProfile.findMany({
        where: riderWhere,
        include: {
          user: { select: { name: true, phone: true, email: true } },
        },
        orderBy: { walletBalance: 'desc' },
      }),
    ]);

    const accounts = [];

    vendors.forEach(v => {
      accounts.push({
        id: v.id,
        partyType: 'VENDOR',
        name: v.businessName,
        contactPerson: v.contactName,
        email: v.email,
        phone: v.phone,
        city: v.city || '—',
        walletBalance: v.walletBalance,
        commissionRate: v.commissionRate,
        kycStatus: v.approvalStatus,
        bankDetails: {
          accountHolder: v.accountHolder,
          accountNumber: v.accountNumber ? `••••${v.accountNumber.slice(-4)}` : null,
          ifsc: v.ifsc,
          bankName: v.bankName,
          upiId: v.upiId,
        },
        totalOrders: v._count.orders,
        totalPayouts: v._count.payoutRequests,
      });
    });

    riders.forEach(r => {
      accounts.push({
        id: r.id,
        partyType: 'RIDER',
        partnerRole: r.partnerType, // delivery, service, both
        name: r.user?.name || 'Rider',
        contactPerson: r.user?.name,
        email: r.user?.email,
        phone: r.user?.phone,
        city: r.address || '—',
        walletBalance: r.walletBalance,
        kycStatus: r.isApproved ? 'approved' : 'pending',
        bankDetails: {
          accountHolder: r.accountHolder,
          accountNumber: r.accountNumber ? `••••${r.accountNumber.slice(-4)}` : null,
          ifsc: r.ifsc,
          bankName: r.bankName,
          upiId: r.upiId,
        },
        totalOrders: r.totalDeliveries,
        codFloat: r.codCashFloat,
      });
    });

    res.json({ success: true, accounts });
  } catch (err) {
    console.error('[AdminPayouts] Accounts error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/payouts/statement/:partyType/:partyId
 * Bank-grade passbook statement showing opening balance,
 * every chronological entry with running balance, and closing balance.
 */
router.get('/statement/:partyType/:partyId', async (req, res) => {
  try {
    const { partyType, partyId } = req.params;
    const normalizedParty = partyType.toUpperCase();

    // Verify account exists
    let accountName = '';
    let currentBalance = 0;

    if (normalizedParty === 'VENDOR') {
      const v = await prisma.vendor.findUnique({ where: { id: partyId } });
      if (!v) return res.status(404).json({ error: 'Vendor not found.' });
      accountName = v.businessName;
      currentBalance = v.walletBalance;
    } else if (normalizedParty === 'RIDER') {
      const r = await prisma.riderProfile.findUnique({
        where: { id: partyId },
        include: { user: { select: { name: true } } },
      });
      if (!r) return res.status(404).json({ error: 'Rider profile not found.' });
      accountName = r.user?.name || 'Rider';
      currentBalance = r.walletBalance;
    }

    // Fetch chronological ledger entries with optional date range
    const { startDate, endDate } = req.query;
    let start = null;
    let end = null;
    if (startDate) start = new Date(startDate);
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    let openingBalance = 0;
    if (start) {
      const priorEntries = await prisma.ledgerEntry.findMany({
        where: {
          party: normalizedParty,
          partyId: partyId,
          createdAt: { lt: start },
        },
      });
      priorEntries.forEach(e => {
        openingBalance += (e.type === 'CREDIT' ? e.amount : -e.amount);
      });
      openingBalance = Math.round(openingBalance * 100) / 100;
    }

    const where = {
      party: normalizedParty,
      partyId: partyId,
    };
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = start;
      if (end) where.createdAt.lte = end;
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            type: true,
            customer: { select: { name: true, phone: true } },
            items: {
              select: {
                id: true,
                name: true,
                quantity: true,
                price: true,
              },
            },
            vendor: { select: { businessName: true } },
            delivery: {
              select: {
                pickupName: true,
                dropoffName: true,
                dropoffAddress: true,
                deliveryFee: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let runningBalance = openingBalance;
    const statementRows = entries.map(e => {
      const change = e.type === 'CREDIT' ? e.amount : -e.amount;
      runningBalance += change;

      const order = e.order;
      const orderNum = order?.orderNumber || (e.orderId ? `ORD-${e.orderId.slice(0, 8).toUpperCase()}` : null);

      let cleanDesc = e.description || 'Ledger Transaction';
      let itemsSummary = '';
      if (order?.items && order.items.length > 0) {
        itemsSummary = order.items.map(it => `${it.name || 'Item'} (${it.quantity}x)`).join(', ');
      }

      if (e.entryType === 'VENDOR_CREDIT') {
        cleanDesc = orderNum ? `Vendor Earning — Order #${orderNum}` : `Vendor Earning Credit`;
      } else if (e.entryType === 'RIDER_CREDIT') {
        cleanDesc = orderNum ? `Delivery Trip Earning — Order #${orderNum}` : `Delivery Trip Earning Credit`;
      } else if (e.entryType === 'PAYOUT') {
        cleanDesc = e.description && !e.description.includes('order #') ? e.description : `Withdrawal Payout (Cleared)`;
      } else if (e.entryType === 'PLATFORM_FEE') {
        cleanDesc = orderNum ? `Platform Commission — Order #${orderNum}` : `Platform Commission Fee`;
      }

      // Sanitize any remaining raw UUID strings into clean readable short-codes
      cleanDesc = cleanDesc.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (uuid) => orderNum || `#${uuid.slice(0, 8).toUpperCase()}`);

      return {
        id: e.id,
        date: e.createdAt,
        type: e.type, // CREDIT or DEBIT
        entryType: e.entryType,
        description: cleanDesc,
        originalDescription: e.description,
        amount: e.amount,
        runningBalance: Math.round(runningBalance * 100) / 100,
        orderId: e.orderId,
        orderNumber: orderNum,
        customerName: order?.customer?.name || null,
        vendorName: order?.vendor?.businessName || order?.delivery?.pickupName || null,
        dropoffAddress: order?.delivery?.dropoffAddress || null,
        itemsSummary: itemsSummary || null,
        orderTotal: order?.total || null,
        metadata: e.metadata,
      };
    });

    res.json({
      success: true,
      account: {
        partyType: normalizedParty,
        partyId,
        accountName,
        currentBalance,
      },
      openingBalance,
      closingBalance: Math.round(runningBalance * 100) / 100,
      entriesCount: statementRows.length,
      statement: statementRows.reverse(), // Newest on top for UI display
    });
  } catch (err) {
    console.error('[AdminPayouts] Statement error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/payouts/manual-adjustment
 * Post an audited manual credit or debit adjustment to any partner ledger.
 */
router.post('/manual-adjustment', requireRole('super_admin'), async (req, res) => {
  try {
    const { partyType, partyId, amount, type, reason } = req.body;
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required.' });
    }
    if (type !== 'CREDIT' && type !== 'DEBIT') {
      return res.status(400).json({ error: 'Adjustment type must be CREDIT or DEBIT.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Mandatory reason is required for manual adjustments.' });
    }

    const normalizedParty = partyType.toUpperCase();

    const adjustmentResult = await prisma.$transaction(async (tx) => {
      // 1. Update wallet balance
      const balanceChange = type === 'CREDIT' ? { increment: numAmount } : { decrement: numAmount };

      if (normalizedParty === 'VENDOR') {
        await tx.vendor.update({
          where: { id: partyId },
          data: { walletBalance: balanceChange },
        });
      } else if (normalizedParty === 'RIDER') {
        await tx.riderProfile.update({
          where: { id: partyId },
          data: { walletBalance: balanceChange },
        });
      } else {
        throw new Error('Unsupported party type for adjustment.');
      }

      // 2. Post immutable LedgerEntry
      const entry = await tx.ledgerEntry.create({
        data: {
          type,
          party: normalizedParty,
          partyId,
          vendorId: normalizedParty === 'VENDOR' ? partyId : null,
          riderProfileId: normalizedParty === 'RIDER' ? partyId : null,
          amount: numAmount,
          entryType: 'MANUAL_ADJUSTMENT',
          description: `Super Admin Manual Adjustment: ${reason.trim()}`,
          metadata: {
            adjustedBy: req.user.id || 'super_admin',
            reason: reason.trim(),
            timestamp: new Date().toISOString(),
          },
        },
      });

      // 3. Settings / Audit Log
      await tx.settingsAuditLog.create({
        data: {
          settingKey: `manual_adjustment_${normalizedParty}_${partyId}`,
          oldValue: null,
          newValue: JSON.stringify({ amount: numAmount, type, reason: reason.trim() }),
          changedBy: req.user.id || 'super_admin',
        },
      });

      return entry;
    });

    res.json({
      success: true,
      message: `Successfully posted ${type} of ₹${numAmount} to ${normalizedParty} ledger.`,
      entry: adjustmentResult,
    });
  } catch (err) {
    console.error('[AdminPayouts] Manual Adjustment error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/payouts/partner/toggle-suspend
 * Super Admin toggles partner account suspension (Vendor or Rider)
 */
router.post('/partner/toggle-suspend', requireRole('super_admin'), async (req, res) => {
  try {
    const { partyType, partyId, reason } = req.body;
    const normalizedParty = String(partyType).toUpperCase();

    let targetUserId = null;
    let partnerName = 'Partner';

    if (normalizedParty === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({
        where: { id: partyId },
        include: { user: true },
      });
      if (!vendor) return res.status(404).json({ error: 'Vendor not found.' });
      targetUserId = vendor.userId;
      partnerName = vendor.businessName;
    } else {
      const rider = await prisma.riderProfile.findUnique({
        where: { id: partyId },
        include: { user: true },
      });
      if (!rider) return res.status(404).json({ error: 'Rider not found.' });
      targetUserId = rider.userId;
      partnerName = rider.user?.name || 'Rider';
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return res.status(404).json({ error: 'Associated user record not found.' });

    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { status: newStatus },
      });

      if (normalizedParty === 'RIDER') {
        await tx.riderProfile.update({
          where: { id: partyId },
          data: {
            isActive: newStatus === 'active',
            isOnline: newStatus === 'active' ? undefined : false,
          },
        });
      } else if (normalizedParty === 'VENDOR') {
        if (newStatus === 'suspended') {
          await tx.vendor.update({
            where: { id: partyId },
            data: { approvalStatus: 'rejected', approvalNote: reason || 'Suspended by Super Admin' },
          });
        } else {
          await tx.vendor.update({
            where: { id: partyId },
            data: { approvalStatus: 'approved', approvalNote: 'Reactivated by Super Admin' },
          });
        }
      }
    });

    res.json({
      success: true,
      message: `${partnerName} account has been ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`,
      status: newStatus,
    });
  } catch (err) {
    console.error('[Admin Partner Suspend] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/payouts/:id
 * Permanently deletes an obsolete, rejected, or test payout request record.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Payout request not found.' });

    await prisma.$transaction(async (tx) => {
      // Clean up linked RiderPayout or Vendor ledger references if any
      await tx.riderPayout.deleteMany({ where: { id } }).catch(() => {});
      await tx.payoutRequest.delete({ where: { id } });
    });

    res.json({ success: true, message: 'Payout request deleted successfully.' });
  } catch (err) {
    console.error('[Admin Payout Delete] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
