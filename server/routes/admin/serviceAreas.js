const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }      = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requirePermission('manage_service_areas'));

/** GET /api/admin/service-areas — FR-05.6 */
router.get('/', async (req, res) => {
  try {
    const { branchId, isActive } = req.query;
    const where = {};
    if (branchId) where.branchId = branchId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const areas = await prisma.serviceArea.findMany({
      where,
      include: {
        branch: { select: { name: true, code: true } },
        pincodes: true,
      },
      orderBy: { name: 'asc' },
    });
    const formatted = areas.map((a) => ({
      ...a,
      pincodes: a.pincodes.map((p) => p.pincode),
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/service-areas */
router.post('/', async (req, res) => {
  try {
    const { branchId, name, pincodes, city, state, isActive, deliveryType } = req.body;
    const area = await prisma.serviceArea.create({
      data: {
        branchId,
        name,
        city,
        state,
        isActive: isActive !== undefined ? isActive : true,
        deliveryType: deliveryType || 'both',
        pincodes: pincodes && pincodes.length
          ? { create: pincodes.map((p) => ({ pincode: p })) }
          : undefined,
      },
      include: { pincodes: true },
    });
    res.status(201).json({ ...area, pincodes: area.pincodes.map((p) => p.pincode) });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** PUT /api/admin/service-areas/:id */
router.put('/:id', async (req, res) => {
  try {
    const { branchId, name, pincodes, city, state, isActive, deliveryType } = req.body;
    if (pincodes) {
      await prisma.serviceAreaPincode.deleteMany({ where: { serviceAreaId: req.params.id } });
      await prisma.serviceAreaPincode.createMany({
        data: pincodes.map((p) => ({ serviceAreaId: req.params.id, pincode: p })),
      });
    }
    const area = await prisma.serviceArea.update({
      where: { id: req.params.id },
      data: { branchId, name, city, state, isActive, deliveryType },
      include: { pincodes: true },
    });
    res.json({ ...area, pincodes: area.pincodes.map((p) => p.pincode) });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** PATCH /api/admin/service-areas/:id/toggle — enable/disable */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const area = await prisma.serviceArea.findUnique({ where: { id: req.params.id } });
    if (!area) return res.status(404).json({ error: 'Service area not found.' });
    const updated = await prisma.serviceArea.update({
      where: { id: req.params.id },
      data: { isActive: !area.isActive },
      include: { pincodes: true },
    });
    res.json({ ...updated, pincodes: updated.pincodes.map((p) => p.pincode) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** DELETE /api/admin/service-areas/:id */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.serviceArea.delete({ where: { id: req.params.id } });
    res.json({ message: 'Service area deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/service-areas/check-pincode — check if pincode is serviceable */
router.post('/check-pincode', async (req, res) => {
  try {
    const { pincode } = req.body;
    const item = await prisma.serviceAreaPincode.findFirst({
      where: { pincode, serviceArea: { isActive: true } },
      include: { serviceArea: { include: { branch: { select: { name: true } } } } },
    });
    res.json({ serviceable: !!item, area: item ? item.serviceArea : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/service-areas/demand-leads — nationwide service demand leads */
router.get('/demand-leads', async (req, res) => {
  try {
    const leads = await prisma.serviceDemandLead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(leads);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

