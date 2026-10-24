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
        ],
        tx
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

module.exports = router;
