const express = require('express');
const prisma = require('../../lib/prisma');
const customerAuth = require('../../middleware/customerAuth');

const router = express.Router();

router.use(customerAuth);

const READ_FIELDS = {
  id: true, label: true, type: true, fullName: true, mobile: true,
  line1: true, line2: true, city: true, state: true, country: true,
  pincode: true, landmark: true, latitude: true, longitude: true, isDefault: true, isActive: true, createdAt: true,
};

/** GET /api/customer/addresses */
router.get('/', async (req, res) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: READ_FIELDS,
    });
    res.json({ addresses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/addresses */
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.fullName || !b.mobile || !b.line1 || !b.city || !b.state || !b.pincode) {
      return res.status(400).json({ error: 'Required fields missing (fullName, mobile, line1, city, state, pincode).' });
    }
    const { _count } = await prisma.address.aggregate({ where: { userId: req.user.userId }, _count: true });
    const isDefault = b.isDefault || _count._count === 0;
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.userId }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({
      data: {
        userId: req.user.userId,
        label: b.label || 'Home',
        type: b.type || 'home',
        fullName: b.fullName,
        mobile: b.mobile,
        line1: b.line1,
        line2: b.line2,
        city: b.city,
        state: b.state,
        country: b.country || 'India',
        pincode: b.pincode,
        landmark: b.landmark,
        latitude: b.latitude ? parseFloat(b.latitude) : null,
        longitude: b.longitude ? parseFloat(b.longitude) : null,
        isDefault,
      },
      select: READ_FIELDS,
    });
    res.status(201).json({ address });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/customer/addresses/:id */
router.put('/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const isDefault = Boolean(b.isDefault);
    if (isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user.userId }, data: { isDefault: false } });
    }
    const address = await prisma.address.updateMany({
      where: { id: req.params.id, userId: req.user.userId },
      data: {
        label: b.label,
        type: b.type,
        fullName: b.fullName,
        mobile: b.mobile,
        line1: b.line1,
        line2: b.line2,
        city: b.city,
        state: b.state,
        country: b.country,
        pincode: b.pincode,
        landmark: b.landmark,
        latitude: b.latitude !== undefined ? (b.latitude ? parseFloat(b.latitude) : null) : undefined,
        longitude: b.longitude !== undefined ? (b.longitude ? parseFloat(b.longitude) : null) : undefined,
        isDefault,
      },
    });
    res.json({ ok: address.count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/customer/addresses/:id */
router.delete('/:id', async (req, res) => {
  try {
    const target = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.userId } });
    await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user.userId } });
    if (target?.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId: req.user.userId }, orderBy: { createdAt: 'asc' } });
      if (next) {
        await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;