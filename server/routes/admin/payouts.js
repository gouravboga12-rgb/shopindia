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

router.use(verifyToken, requireRole('super_admin'));

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
              city: true,
              walletBalance: true,
              accountHolder: true,
              accountNumber: true,
              ifsc: true,
              bankName: true,
              upiId: true,
            },
          },
          riderProfile: {
            include: {
              user: { select: { name: true, phone: true, email: true } },
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
router.post('/:id/approve', async (req, res) => {
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
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { utr, notes } = req.body;

    if (!utr || !utr.trim()) {
      return res.status(400).json({ error: 'Unique Transaction Reference (UTR) is required.' });
    }

    const request = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Payout request not found.' });

    if (request.status === 'completed') {
      return res.status(400).json({ error: 'This payout has already been marked as completed.' });
    }

    // Execute in database transaction:
    // 1. Mark request completed with UTR
    // 2. Decrement partner walletBalance
    // 3. Post immutable LedgerEntry (PAYOUT DEBIT)
    const result = await prisma.$transaction(async (tx) => {
      const completedRequest = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          razorpayPayoutId: utr.trim(),
          notes: notes ? `${request.notes || ''}\n[Completed UTR ${utr.trim()}]: ${notes}`.trim() : `UTR: ${utr.trim()}`,
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
            description: `Bank/UPI Payout Disbursed — UTR: ${utr.trim()}`,
            metadata: {
              payoutRequestId: id,
              utr: utr.trim(),
              processedBy: req.user.id || 'super_admin',
            },
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
            description: `Rider/Technician Payout Disbursed — UTR: ${utr.trim()}`,
            metadata: {
              payoutRequestId: id,
              utr: utr.trim(),
              processedBy: req.user.id || 'super_admin',
            },
          },
        });
      }

      return completedRequest;
    });

    res.json({
      success: true,
      message: `Payout of ₹${request.amount} marked paid successfully with UTR ${utr.trim()}.`,
      payout: result,
    });
  } catch (err) {
    console.error('[AdminPayouts] Complete error:', err);
    res.status(500).json({ error: err.message || 'Failed to complete payout disbursement.' });
  }
});

/**
 * POST /api/admin/payouts/:id/reject
 * Reject a payout request with reason
 */
router.post('/:id/reject', async (req, res) => {
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
    const { type = 'all', search } = req.query;

    const [vendors, riders] = await Promise.all([
      type === 'rider' ? [] : prisma.vendor.findMany({
        where: search ? {
          OR: [
            { businessName: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        } : {},
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

      if (e.entryType === 'VENDOR_CREDIT' && orderNum) {
        cleanDesc = `Vendor Earning — Order #${orderNum}`;
      } else if (e.entryType === 'RIDER_CREDIT' && orderNum) {
        cleanDesc = `Delivery Trip Earning — Order #${orderNum}`;
      } else if (e.entryType === 'PAYOUT') {
        cleanDesc = e.description && !e.description.includes('order #') ? e.description : `Withdrawal Payout (Cleared)`;
      } else if (e.entryType === 'PLATFORM_FEE' && orderNum) {
        cleanDesc = `Platform Commission — Order #${orderNum}`;
      }

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
router.post('/manual-adjustment', async (req, res) => {
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

module.exports = router;
