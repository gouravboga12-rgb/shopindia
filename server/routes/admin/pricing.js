const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { simulatePricing, invalidatePricingCache } = require('../../lib/pricing');

// Super admin only access for financial pricing controls
router.use(verifyToken);
router.use(requireRole('super_admin'));

/**
 * GET /api/admin/pricing/rules
 * Returns all active and inactive pricing rules
 */
router.get('/rules', async (req, res) => {
  try {
    const rules = await prisma.pricingRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Populate scope details (category name, vendor name if applicable)
    const enriched = await Promise.all(rules.map(async (r) => {
      let targetName = null;
      if (r.scope === 'category' && r.scopeId) {
        const cat = await prisma.category.findUnique({ where: { id: r.scopeId }, select: { name: true } });
        targetName = cat?.name;
      } else if (r.scope === 'vendor' && r.scopeId) {
        const v = await prisma.vendor.findUnique({ where: { id: r.scopeId }, select: { storeName: true } });
        targetName = v?.storeName;
      } else if (r.scope === 'product' && r.scopeId) {
        const p = await prisma.product.findUnique({ where: { id: r.scopeId }, select: { name: true } });
        targetName = p?.name;
      }
      return {
        ...r,
        targetName,
        commissionPct: parseFloat(r.commissionPct)
      };
    }));

    res.json({ success: true, rules: enriched });
  } catch (err) {
    console.error('[AdminPricing] Error fetching rules:', err);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
});

/**
 * POST /api/admin/pricing/rules
 * Create or update a pricing rule with audit logging
 */
router.post('/rules', async (req, res) => {
  try {
    const {
      id,
      scope,
      scopeId,
      vertical,
      commissionPct,
      includeGateway,
      deliveryFeeRules,
      description,
      isActive
    } = req.body;

    if (!scope || commissionPct == null) {
      return res.status(400).json({ error: 'Scope and commission percentage are required' });
    }

    const pct = parseFloat(commissionPct);
    if (isNaN(pct) || pct < 0 || pct > 75) {
      return res.status(400).json({ error: 'Commission percentage must be between 0% and 75%' });
    }

    let savedRule;
    let oldVal = null;

    if (id) {
      const existing = await prisma.pricingRule.findUnique({ where: { id } });
      if (existing) oldVal = JSON.stringify(existing);

      savedRule = await prisma.pricingRule.update({
        where: { id },
        data: {
          scope,
          scopeId: scopeId || null,
          vertical: vertical || null,
          commissionPct: pct,
          includeGateway: includeGateway !== false,
          deliveryFeeRules: deliveryFeeRules || undefined,
          description: description || null,
          isActive: isActive !== false
        }
      });
    } else {
      savedRule = await prisma.pricingRule.create({
        data: {
          scope,
          scopeId: scopeId || null,
          vertical: vertical || null,
          commissionPct: pct,
          includeGateway: includeGateway !== false,
          deliveryFeeRules: deliveryFeeRules || undefined,
          description: description || null,
          isActive: isActive !== false
        }
      });
    }

    // Audit Log
    await prisma.settingsAuditLog.create({
      data: {
        settingKey: `pricing_rule_${savedRule.id}`,
        oldValue: oldVal,
        newValue: JSON.stringify(savedRule),
        changedBy: req.user?.id || 'super_admin'
      }
    }).catch(e => console.warn('[AdminPricing] Audit log error:', e.message));

    // Clear memory cache so changes take effect immediately
    invalidatePricingCache();

    res.json({ success: true, rule: savedRule });
  } catch (err) {
    console.error('[AdminPricing] Error saving rule:', err);
    res.status(500).json({ error: err.message || 'Failed to save pricing rule' });
  }
});

/**
 * DELETE /api/admin/pricing/rules/:id
 */
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.pricingRule.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Pricing rule not found' });
    }

    await prisma.pricingRule.delete({ where: { id } });

    await prisma.settingsAuditLog.create({
      data: {
        settingKey: `pricing_rule_delete_${id}`,
        oldValue: JSON.stringify(existing),
        newValue: 'DELETED',
        changedBy: req.user?.id || 'super_admin'
      }
    }).catch(e => console.warn('[AdminPricing] Audit log error:', e.message));

    invalidatePricingCache();
    res.json({ success: true, message: 'Rule deleted successfully' });
  } catch (err) {
    console.error('[AdminPricing] Error deleting rule:', err);
    res.status(500).json({ error: 'Failed to delete pricing rule' });
  }
});

/**
 * GET /api/admin/pricing/delivery-rules
 */
router.get('/delivery-rules', async (req, res) => {
  try {
    const rules = await prisma.deliveryPayRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, rules });
  } catch (err) {
    console.error('[AdminPricing] Error fetching delivery rules:', err);
    res.status(500).json({ error: 'Failed to fetch delivery pay rules' });
  }
});

/**
 * POST /api/admin/pricing/delivery-rules
 */
router.post('/delivery-rules', async (req, res) => {
  try {
    const {
      id,
      scope,
      scopeId,
      vertical,
      basePayPerOrder,
      payPerKm,
      maxDistanceKm,
      description,
      isActive
    } = req.body;

    const basePay = parseFloat(basePayPerOrder) >= 0 ? parseFloat(basePayPerOrder) : 30;
    const perKm = parseFloat(payPerKm) >= 0 ? parseFloat(payPerKm) : 5;
    const maxDist = parseFloat(maxDistanceKm) >= 0 ? parseFloat(maxDistanceKm) : 15;

    let saved;
    let oldVal = null;
    if (id) {
      const existing = await prisma.deliveryPayRule.findUnique({ where: { id } });
      if (existing) oldVal = JSON.stringify(existing);

      saved = await prisma.deliveryPayRule.update({
        where: { id },
        data: {
          scope: scope || 'global',
          scopeId: scopeId || null,
          vertical: vertical || null,
          basePayPerOrder: basePay,
          payPerKm: perKm,
          maxDistanceKm: maxDist,
          description: description || null,
          isActive: isActive !== false
        }
      });
    } else {
      // Check if a global rule already exists to avoid duplicate rows
      const existingGlobal = await prisma.deliveryPayRule.findFirst({
        where: { scope: scope || 'global' }
      });

      if (existingGlobal) {
        oldVal = JSON.stringify(existingGlobal);
        saved = await prisma.deliveryPayRule.update({
          where: { id: existingGlobal.id },
          data: {
            scope: scope || 'global',
            scopeId: scopeId || null,
            vertical: vertical || null,
            basePayPerOrder: basePay,
            payPerKm: perKm,
            maxDistanceKm: maxDist,
            description: description || existingGlobal.description,
            isActive: isActive !== false
          }
        });
      } else {
        saved = await prisma.deliveryPayRule.create({
          data: {
            scope: scope || 'global',
            scopeId: scopeId || null,
            vertical: vertical || null,
            basePayPerOrder: basePay,
            payPerKm: perKm,
            maxDistanceKm: maxDist,
            description: description || 'Global Quick Commerce Rider Pay Rule',
            isActive: isActive !== false
          }
        });
      }
    }

    await prisma.settingsAuditLog.create({
      data: {
        settingKey: `delivery_pay_rule_${saved.id}`,
        oldValue: oldVal,
        newValue: JSON.stringify(saved),
        changedBy: req.user?.id || 'super_admin'
      }
    }).catch(e => console.warn('[AdminPricing] Audit log error:', e.message));

    invalidatePricingCache();
    res.json({ success: true, rule: saved });
  } catch (err) {
    console.error('[AdminPricing] Error saving delivery rule:', err);
    res.status(500).json({ error: 'Failed to save delivery rule' });
  }
});

/**
 * GET /api/admin/pricing/settings
 * Key-value settings for Pan-India (Shiprocket) shipping, quick commerce delivery fees, and gateway buffers
 */
router.get('/settings', async (req, res) => {
  try {
    const rows = await prisma.appSetting.findMany();
    const settings = {
      // Defaults
      shiprocket_base_fee: '49',
      shiprocket_free_delivery_enabled: 'false',
      shiprocket_free_threshold: '499',
      shiprocket_estimated_cost: '45',
      quick_customer_base_fee: '35',
      quick_customer_per_km: '7',
      quick_free_delivery_enabled: 'false',
      quick_free_threshold: '999',
      include_gateway_in_platform_fee: 'true',
      gateway_fee_percent: '2.36',
      service_visit_charge: '199',
      service_technician_min_pay: '149',
      service_commission_pct: '15',
      gst_percent: '18',
      cgst_percent: '9',
      sgst_percent: '9',
      platform_charge_pct: '3.0',

      // Midnight Blackout Defaults (Image 54)
      midnight_blackout_enabled: 'false',
      midnight_blackout_start: '23:00',
      midnight_blackout_end: '07:00',
      midnight_blackout_verticals: 'both', // 'quick', 'services', 'both'
      midnight_blackout_title: "Closed for the day! We'll be back at 7 AM.",
      midnight_blackout_message: "We are currently closed for the night. You can browse products and services; orders will reopen at 7:00 AM.",

      // Friday Prayer Break Defaults (Image 55)
      friday_break_enabled: 'false',
      friday_break_day: '5', // 5 = Friday
      friday_break_start: '12:00',
      friday_break_end: '14:00',
      friday_break_verticals: 'both',
      friday_break_title: 'Friday Prayer Break',
      friday_break_subtitle: "We're briefly closed for Friday Prayer (12:00 PM – 2:00 PM)",
      friday_break_message: 'Our services will resume shortly.'
    };

    rows.forEach(r => {
      settings[r.key] = r.value;
    });

    res.json({ success: true, settings });
  } catch (err) {
    console.error('[AdminPricing] Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * POST /api/admin/pricing/settings
 * Update multiple key-value settings and delivery rules with audit logs
 */
router.post('/settings', async (req, res) => {
  try {
    const { settings, deliveryRule } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      const strVal = String(value);
      const existing = await prisma.appSetting.findUnique({ where: { key } });

      updates.push(
        prisma.appSetting.upsert({
          where: { key },
          create: {
            key,
            value: strVal,
            updatedBy: req.user?.id || 'super_admin'
          },
          update: {
            value: strVal,
            updatedBy: req.user?.id || 'super_admin'
          }
        })
      );

      // Audit Log
      updates.push(
        prisma.settingsAuditLog.create({
          data: {
            settingKey: key,
            oldValue: existing ? existing.value : null,
            newValue: strVal,
            changedBy: req.user?.id || 'super_admin'
          }
        })
      );
    }

    let savedRule = null;
    if (deliveryRule && typeof deliveryRule === 'object') {
      const basePay = parseFloat(deliveryRule.basePayPerOrder) >= 0 ? parseFloat(deliveryRule.basePayPerOrder) : 30;
      const perKm = parseFloat(deliveryRule.payPerKm) >= 0 ? parseFloat(deliveryRule.payPerKm) : 5;
      const maxDist = parseFloat(deliveryRule.maxDistanceKm) >= 0 ? parseFloat(deliveryRule.maxDistanceKm) : 15;

      const existingGlobal = deliveryRule.id
        ? await prisma.deliveryPayRule.findUnique({ where: { id: deliveryRule.id } })
        : await prisma.deliveryPayRule.findFirst({ where: { scope: deliveryRule.scope || 'global' } });

      if (existingGlobal) {
        savedRule = await prisma.deliveryPayRule.update({
          where: { id: existingGlobal.id },
          data: {
            scope: deliveryRule.scope || 'global',
            basePayPerOrder: basePay,
            payPerKm: perKm,
            maxDistanceKm: maxDist,
            description: deliveryRule.description || existingGlobal.description,
            isActive: deliveryRule.isActive !== false
          }
        });
      } else {
        savedRule = await prisma.deliveryPayRule.create({
          data: {
            scope: deliveryRule.scope || 'global',
            basePayPerOrder: basePay,
            payPerKm: perKm,
            maxDistanceKm: maxDist,
            description: deliveryRule.description || 'Global Quick Commerce Rider Pay Rule',
            isActive: deliveryRule.isActive !== false
          }
        });
      }

      updates.push(
        prisma.settingsAuditLog.create({
          data: {
            settingKey: `delivery_pay_rule_${savedRule.id}`,
            oldValue: existingGlobal ? JSON.stringify(existingGlobal) : null,
            newValue: JSON.stringify(savedRule),
            changedBy: req.user?.id || 'super_admin'
          }
        })
      );
    }

    // Automatically keep PricingRule for vertical 'services' synchronized
    if (settings.service_commission_pct != null) {
      const commPct = parseFloat(settings.service_commission_pct);
      if (!isNaN(commPct) && commPct >= 0) {
        const existingServicesRule = await prisma.pricingRule.findFirst({
          where: { scope: 'vertical', vertical: 'services' }
        });

        if (existingServicesRule) {
          await prisma.pricingRule.update({
            where: { id: existingServicesRule.id },
            data: {
              commissionPct: commPct,
              description: 'Doorstep Services & Repairs Commission',
              isActive: true
            }
          });
        } else {
          await prisma.pricingRule.create({
            data: {
              scope: 'vertical',
              vertical: 'services',
              commissionPct: commPct,
              includeGateway: true,
              description: 'Doorstep Services & Repairs Commission',
              isActive: true
            }
          });
        }
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
    invalidatePricingCache();

    res.json({ success: true, message: 'Settings saved successfully', deliveryRule: savedRule });
  } catch (err) {
    console.error('[AdminPricing] Error saving settings:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * GET /api/admin/pricing/audit-logs
 * Audit history of pricing and commission modifications
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await prisma.settingsAuditLog.findMany({
      take: 50,
      orderBy: { changedAt: 'desc' }
    });
    res.json({ success: true, logs });
  } catch (err) {
    console.error('[AdminPricing] Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * DELETE /api/admin/pricing/audit-logs/:id
 * Permanently delete a specific audit log record
 */
router.delete('/audit-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.settingsAuditLog.delete({ where: { id } });
    res.json({ success: true, message: 'Audit log deleted successfully' });
  } catch (err) {
    console.error('[AdminPricing] Error deleting audit log:', err);
    res.status(500).json({ error: 'Failed to delete audit log' });
  }
});

/**
 * DELETE /api/admin/pricing/audit-logs
 * Permanently purge all audit log records from the database
 */
router.delete('/audit-logs', async (req, res) => {
  try {
    const deleted = await prisma.settingsAuditLog.deleteMany({});
    res.json({ success: true, message: `All ${deleted.count} audit logs cleared successfully` });
  } catch (err) {
    console.error('[AdminPricing] Error clearing audit logs:', err);
    res.status(500).json({ error: 'Failed to clear audit logs' });
  }
});

/**
 * POST /api/admin/pricing/simulate
 * Real-time profit / loss simulation for the Super Admin
 */
router.post('/simulate', async (req, res) => {
  try {
    const simulation = await simulatePricing(req.body);
    res.json({ success: true, simulation });
  } catch (err) {
    console.error('[AdminPricing] Error running simulation:', err);
    res.status(500).json({ error: 'Failed to run pricing simulation' });
  }
});

module.exports = router;
