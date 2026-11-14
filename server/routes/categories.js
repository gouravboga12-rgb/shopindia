const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

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