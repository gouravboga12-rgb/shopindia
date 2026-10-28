'use strict';
/**
 * server/routes/admin/cod-settings.js
 * Super Admin COD Clearance Engine & Float Management Settings.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { postLedgerEntries } = require('../../lib/ledger');

router.use(verifyToken, requireRole('super_admin'));

const DEFAULT_SETTINGS = {
  cod_deadline_rule: 'end_of_day', // 'end_of_day' | 'order_count'
  cod_order_count_threshold: '3',   // 2 or 3 orders before forced cash clearance
  cod_max_float_limit: '3000',      // ₹3,000 max cash float before dispatch pause
  cod_allow_regional_cash: 'true',  // Allow physical cash submission if regional admin exists
  cod_auto_pause_rider: 'true',     // Auto-pause rider radar dispatch when float exceeded
};

/**
 * GET /api/admin/cod-settings
 * Returns the current platform COD clearance settings.
 */
router.get('/', async (req, res) => {
  try {
    const keys = Object.keys(DEFAULT_SETTINGS);
    const dbSettings = await prisma.appSetting.findMany({
      where: { key: { in: keys } },
    });

    const settings = { ...DEFAULT_SETTINGS };
    dbSettings.forEach((s) => {
      settings[s.key] = s.value;
    });

    res.json({
      success: true,
      settings: {
        deadlineRule: settings.cod_deadline_rule,
        orderCountThreshold: parseInt(settings.cod_order_count_threshold, 10) || 3,
        maxFloatLimit: parseFloat(settings.cod_max_float_limit) || 3000,
        allowRegionalCash: settings.cod_allow_regional_cash === 'true',
        autoPauseRider: settings.cod_auto_pause_rider === 'true',
      },
    });
  } catch (err) {
    console.error('[Admin CODSettings] Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/cod-settings
 * Updates COD clearance rules and writes immutable audit logs.
 */
router.post('/', async (req, res) => {
  try {
    const {
      deadlineRule,
      orderCountThreshold,
      maxFloatLimit,
      allowRegionalCash,
      autoPauseRider,
    } = req.body;

    const updates = [
      { key: 'cod_deadline_rule', value: deadlineRule === 'order_count' ? 'order_count' : 'end_of_day', desc: 'COD Clearance Deadline Rule' },
      { key: 'cod_order_count_threshold', value: String(parseInt(orderCountThreshold, 10) || 3), desc: 'Max consecutive COD orders before clearance' },
      { key: 'cod_max_float_limit', value: String(parseFloat(maxFloatLimit) || 3000), desc: 'Maximum allowable floating cash held by rider (INR)' },
      { key: 'cod_allow_regional_cash', value: String(Boolean(allowRegionalCash)), desc: 'Allow physical cash submission to Regional Admin if available' },
      { key: 'cod_auto_pause_rider', value: String(Boolean(autoPauseRider)), desc: 'Auto-pause rider dispatch when float limit exceeded' },
    ];

    const adminId = req.user.userId || req.user.id || 'super_admin';

    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        const existing = await tx.appSetting.findUnique({ where: { key: item.key } });
        const oldVal = existing?.value || DEFAULT_SETTINGS[item.key] || null;

        await tx.appSetting.upsert({
          where: { key: item.key },
          update: {
            value: item.value,
            description: item.desc,
            updatedBy: adminId,
          },
          create: {
            key: item.key,
            value: item.value,
            description: item.desc,
            updatedBy: adminId,
          },
        });

        if (oldVal !== item.value) {
          await tx.settingsAuditLog.create({
            data: {
              settingKey: item.key,
              oldValue: oldVal,
              newValue: item.value,
              changedBy: adminId,
            },
          });
        }
      }

      // Also update riders codFloatLimit to match new max float if configured
      if (maxFloatLimit) {
        await tx.riderProfile.updateMany({
          data: { codFloatLimit: parseFloat(maxFloatLimit) || 3000 },
        });
      }
    });

    res.json({
      success: true,
      message: 'COD clearance settings successfully saved and applied platform-wide.',
    });
  } catch (err) {
    console.error('[Admin CODSettings] Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/cod-settings/riders
 * Monitors all riders holding offline COD cash in real time.
 */
router.get('/riders', async (req, res) => {
  try {
    const riders = await prisma.riderProfile.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, status: true } },
        branch: { select: { id: true, name: true, city: true } },
        deliveries: {
          where: {
            status: 'delivered',
            order: { paymentMethod: 'cod' },
          },
          select: { id: true, deliveryFee: true, createdAt: true, order: { select: { id: true, total: true, orderNumber: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { codCashFloat: 'desc' },
    });

    const activeSettings = await prisma.appSetting.findMany({
      where: { key: { in: ['cod_deadline_rule', 'cod_order_count_threshold', 'cod_max_float_limit'] } },
    });
    const settingsMap = {};
    activeSettings.forEach((s) => (settingsMap[s.key] = s.value));

    const deadlineRule = settingsMap.cod_deadline_rule || 'end_of_day';
    const orderThreshold = parseInt(settingsMap.cod_order_count_threshold, 10) || 3;
    const maxFloat = parseFloat(settingsMap.cod_max_float_limit) || 3000;

    const monitoredRiders = riders.map((r) => {
      const float = r.codCashFloat || 0;
      const limit = r.codFloatLimit || maxFloat;
      const unremittedCount = r.deliveries?.length || 0;

      let complianceStatus = 'compliant'; // 'compliant' | 'warning' | 'overdue_paused'
      let reason = 'Within limits';

      if (float >= limit) {
        complianceStatus = 'overdue_paused';
        reason = `Float limit exceeded (₹${float} / ₹${limit})`;
      } else if (deadlineRule === 'order_count' && unremittedCount >= orderThreshold && float > 0) {
        complianceStatus = 'overdue_paused';
        reason = `${unremittedCount} consecutive COD orders unremitted (Threshold: ${orderThreshold})`;
      } else if (float > limit * 0.75) {
        complianceStatus = 'warning';
        reason = 'Approaching maximum cash float limit';
      }

      return {
        id: r.id,
        userId: r.user?.id,
        name: r.user?.name || 'Rider',
        phone: r.user?.phone,
        email: r.user?.email,
        vehicleType: r.vehicleType,
        branch: r.branch?.name || r.branch?.city || 'Unassigned',
        codCashFloat: float,
        codFloatLimit: limit,
        unremittedDeliveriesCount: unremittedCount,
        complianceStatus,
        reason,
        isOnline: r.isOnline,
        isActive: r.isActive,
      };
    });

    res.json({
      success: true,
      totalFloatingCash: monitoredRiders.reduce((acc, r) => acc + r.codCashFloat, 0),
      deadlineRule,
      riders: monitoredRiders,
    });
  } catch (err) {
    console.error('[Admin CODSettings] Riders error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/cod-settings/riders/:id/force-clear
 * Super Admin manual clearance for a rider's COD float (e.g. verified direct bank wire).
 */
router.post('/riders/:id/force-clear', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const rider = await prisma.riderProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!rider) return res.status(404).json({ error: 'Rider not found.' });

    const floatToClear = rider.codCashFloat || 0;
    if (floatToClear <= 0) {
      return res.status(400).json({ error: 'Rider has zero floating cash.' });
    }

    const adminId = req.user.userId || req.user.id || 'super_admin';

    await prisma.$transaction(async (tx) => {
      // 1. Decrement rider float to zero
      await tx.riderProfile.update({
        where: { id },
        data: { codCashFloat: 0 },
      });

      // 2. Create a completed CODRemittance record
      await tx.cODRemittance.create({
        data: {
          riderProfileId: id,
          amount: floatToClear,
          status: 'verified',
          clearanceMode: 'admin_manual',
          notes: notes?.trim() || `Manual clearance by Super Admin (${adminId})`,
          receivedByAdminAt: new Date(),
          remittedToSuperAt: new Date(),
        },
      });

      // 3. Post immutable Ledger debit
      await postLedgerEntries(
        tx,
        [
          {
            type: 'DEBIT',
            party: 'RIDER',
            partyId: id,
            amount: floatToClear,
            entryType: 'COD_REMITTANCE',
            description: `Super Admin manual cash clearance of ₹${floatToClear} for ${rider.user?.name}`,
            metadata: {
              clearedBy: adminId,
              notes: notes || 'Admin override',
              timestamp: new Date().toISOString(),
            },
            riderProfileId: id,
          },
        ]
      );
    });

    res.json({
      success: true,
      message: `Successfully cleared ₹${floatToClear} COD cash float for ${rider.user?.name}.`,
    });
  } catch (err) {
    console.error('[Admin CODSettings] Force clear error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/cod-settings/super-bank-details
 * Returns Super Admin bank details for Regional Hub cash remittance.
 */
router.get('/super-bank-details', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'super_admin_cod_bank_details' },
    });

    let details = {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200088921456',
      ifsc: 'HDFC0001234',
      accountHolder: 'ShopIndia Technologies Pvt Ltd',
      upiId: 'shopindia.hq@okhdfcbank',
    };

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        details = { ...details, ...parsed };
      } catch (e) {
        console.warn('Failed to parse bank details json:', e);
      }
    }

    res.json({ success: true, bankDetails: details });
  } catch (err) {
    console.error('[Admin COD Bank Details GET] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/cod-settings/super-bank-details
 * Updates Super Admin bank details for Regional Hub cash remittance.
 */
router.post('/super-bank-details', async (req, res) => {
  try {
    const { bankName, accountNumber, ifsc, accountHolder, upiId } = req.body;

    const dataToSave = {
      bankName: String(bankName || '').trim(),
      accountNumber: String(accountNumber || '').trim(),
      ifsc: String(ifsc || '').trim().toUpperCase(),
      accountHolder: String(accountHolder || '').trim(),
      upiId: String(upiId || '').trim(),
    };

    const adminId = req.user?.userId || req.user?.id || 'super_admin';

    await prisma.appSetting.upsert({
      where: { key: 'super_admin_cod_bank_details' },
      update: {
        value: JSON.stringify(dataToSave),
        description: 'Super Admin official bank details for Regional Hub cash deposits',
        updatedBy: adminId,
      },
      create: {
        key: 'super_admin_cod_bank_details',
        value: JSON.stringify(dataToSave),
        description: 'Super Admin official bank details for Regional Hub cash deposits',
        updatedBy: adminId,
      },
    });

    res.json({
      success: true,
      message: 'Super Admin official bank remittance details updated successfully.',
      bankDetails: dataToSave,
    });
  } catch (err) {
    console.error('[Admin COD Bank Details POST] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/cod-settings/remittances
 * Date-wise collections & remittance ledger across riders and regional hubs.
 */
router.get('/remittances', async (req, res) => {
  try {
    const { startDate, endDate, status, search, limit = 50, page = 1 } = req.query;

    const where = {};

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Status filter
    if (status && status !== 'all') {
      if (status === 'pending_bank_verification') {
        where.clearanceMode = 'bank_transfer';
        where.remittedToSuperAt = null;
        where.superAdminRazorpayId = { not: null };
      } else if (status === 'paid_online') {
        where.status = { in: ['paid_online', 'verified'] };
        where.clearanceMode = 'online';
      } else if (status === 'verified_bank') {
        where.clearanceMode = 'bank_transfer';
        where.remittedToSuperAt = { not: null };
      }
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { superAdminRazorpayId: { contains: q, mode: 'insensitive' } },
        { razorpayPaymentId: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { riderProfile: { user: { name: { contains: q, mode: 'insensitive' } } } },
        { riderProfile: { user: { phone: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(5, parseInt(limit, 10) || 50));

    const [records, totalCount, aggregateStats] = await Promise.all([
      prisma.cODRemittance.findMany({
        where,
        include: {
          riderProfile: {
            include: {
              user: { select: { id: true, name: true, phone: true, email: true } },
              branch: { select: { name: true, city: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.cODRemittance.count({ where }),
      prisma.cODRemittance.aggregate({
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Platform-wide metrics for the active filter
    const totalCollected = aggregateStats._sum.amount || 0;

    // Count pending offline bank transfers needing super admin verification
    const pendingBankCount = await prisma.cODRemittance.count({
      where: {
        clearanceMode: 'bank_transfer',
        remittedToSuperAt: null,
        superAdminRazorpayId: { not: null },
      },
    });

    res.json({
      success: true,
      totalCount,
      totalCollected,
      pendingBankCount,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalCount / limitNum),
      remittances: records,
    });
  } catch (err) {
    console.error('[Admin COD Remittances GET] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/cod-settings/remittances/:id/verify-bank
 * Super Admin verifies an offline bank transfer (UTR) submitted by Regional Admin.
 */
router.post('/remittances/:id/verify-bank', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const remittance = await prisma.cODRemittance.findUnique({
      where: { id },
      include: {
        riderProfile: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!remittance) return res.status(404).json({ error: 'Remittance record not found.' });

    const adminId = req.user?.userId || req.user?.id || 'super_admin';

    await prisma.$transaction(async (tx) => {
      await tx.cODRemittance.update({
        where: { id },
        data: {
          status: 'verified',
          remittedToSuperAt: new Date(),
          notes: `${remittance.notes || ''} | Super Admin Verified (UTR: ${remittance.superAdminRazorpayId}) by ${adminId}. ${notes ? 'Note: ' + notes : ''}`,
        },
      });

      // Post platform ledger credit
      await postLedgerEntries(
        tx,
        [
          {
            type: 'CREDIT',
            party: 'PLATFORM',
            partyId: 'SUPER_ADMIN',
            amount: remittance.amount,
            entryType: 'COD_REMITTANCE',
            description: `Offline bank remittance of ₹${remittance.amount} verified by Super Admin (UTR: ${remittance.superAdminRazorpayId || 'N/A'})`,
            metadata: {
              remittanceId: id,
              utr: remittance.superAdminRazorpayId,
              verifiedBy: adminId,
              timestamp: new Date().toISOString(),
            },
          },
        ]
      );
    });

    res.json({
      success: true,
      message: `Successfully verified bank transfer for ₹${remittance.amount}. Added to company ledger.`,
    });
  } catch (err) {
    console.error('[Admin COD Verify Bank] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
