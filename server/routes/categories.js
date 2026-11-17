const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

const DEFAULT_QUICK_DEPARTMENTS = [
  { id: 'grocery', label: 'Instant Grocery', icon: '🥦', badge: '10 MINS', color: 'emerald', verticalKey: 'quick_grocery', tagline: 'ShopIndia Local: One App for Your Neighbourhood.' },
  { id: 'food', label: 'Food & Dining', icon: '🍲', badge: 'LIVE KITCHENS', color: 'orange', verticalKey: 'quick_food', tagline: 'Discover Delicious Food Around You' },
  { id: 'pharmacy', label: 'Pharmacy', icon: '💊', badge: 'CERTIFIED PHARMA', color: 'blue', verticalKey: 'quick_pharmacy', tagline: 'Discover Pharmacies & Health Essentials Near You' }
];

/** GET /api/categories/departments — public dynamic quick commerce major departments */
router.get('/departments', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'quick_departments' } });
    let departments = DEFAULT_QUICK_DEPARTMENTS;
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          departments = parsed;
        }
      } catch (_) {}
    }
    res.json({ success: true, departments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/categories — public storefront categories (active only) */
router.get('/', async (req, res) => {
  try {
    const where = { isActive: true };
    if (req.query.vertical) {
      // Supports exact or substring match (e.g. 'services' matches 'services_home', 'services_vehicle', etc.)
      where.vertical = { contains: req.query.vertical, mode: 'insensitive' };
    }
    const categories = await prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        vertical: true,
        image: true,
        sortOrder: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ vertical: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;