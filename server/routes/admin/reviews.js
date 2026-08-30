const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');

const router = express.Router();
router.use(verifyToken);

/** GET /api/admin/reviews - Get all reviews across all products */
router.get('/', async (req, res) => {
  try {
    const { productId, rating, page = 1, limit = 50 } = req.query;
    const where = {};
    if (productId) where.productId = String(productId);
    if (rating) where.rating = Number(rating);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, brand: true, images: { take: 1 } } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.review.count({ where })
    ]);

    res.json({ reviews, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/admin/reviews/:id - Delete / moderate an inappropriate review */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
