const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
router.use(verifyToken, requireRole('vendor'));

/** GET /api/vendor/reviews - Get reviews for products owned by this vendor */
router.get('/', async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId },
      select: { id: true }
    });

    const productIds = vendorProducts.map(p => p.id);

    const reviews = await prisma.review.findMany({
      where: { productId: { in: productIds } },
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { id: true, name: true, images: { take: 1 } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
