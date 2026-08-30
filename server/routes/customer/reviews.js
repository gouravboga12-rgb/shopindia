const express = require('express');
const prisma = require('../../lib/prisma');
const customerAuth = require('../../middleware/customerAuth');

const router = express.Router();

router.use(customerAuth);

/** GET /api/customer/reviews */
router.get('/', async (req, res) => {
  try {
    const where = { userId: req.user.userId };
    if (req.query.boughtOnly === 'true') where.isVerified = true;
    const reviews = await prisma.review.findMany({
      where,
      include: { product: { select: { id: true, name: true, images: { take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.product?.name || 'Purchased Item',
      productImage: r.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60',
      rating: r.rating,
      title: r.title || '',
      body: r.body,
      images: r.images || [],
      isVerified: r.isVerified,
      createdAt: r.createdAt.toISOString()
    }));

    res.json({ reviews: mapped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/customer/reviews */
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.productId) return res.status(400).json({ error: 'productId required.' });
    if (!b.rating || b.rating < 1 || b.rating > 5) return res.status(400).json({ error: 'rating must be 1-5.' });
    if (!b.body) return res.status(400).json({ error: 'body required.' });

    let targetProduct = await prisma.product.findUnique({ where: { id: b.productId } });
    if (!targetProduct) {
      targetProduct = await prisma.product.findFirst({
        where: { name: { contains: b.productName || '', mode: 'insensitive' } }
      }) || await prisma.product.findFirst();
    }

    if (!targetProduct) {
      return res.status(404).json({ error: 'Product not found in catalog.' });
    }

    const purchased = await prisma.orderItem.findFirst({
      where: { productId: targetProduct.id, order: { customerId: req.user.userId } },
    });

    const review = await prisma.review.upsert({
      where: { userId_productId: { userId: req.user.userId, productId: targetProduct.id } },
      update: { rating: b.rating, title: b.title || '', body: b.body, images: b.images || [], isVerified: true },
      create: {
        userId: req.user.userId,
        productId: targetProduct.id,
        orderItemId: purchased?.id || null,
        rating: b.rating,
        title: b.title || '',
        body: b.body,
        images: b.images || [],
        isVerified: true,
      },
    });

    // Recalculate and update product rating
    const allRatings = await prisma.review.findMany({
      where: { productId: targetProduct.id },
      select: { rating: true }
    });
    const avg = allRatings.reduce((acc, curr) => acc + curr.rating, 0) / (allRatings.length || 1);
    await prisma.product.update({
      where: { id: targetProduct.id },
      data: {
        ratingAvg: parseFloat(avg.toFixed(1)),
        ratingCount: allRatings.length
      }
    });

    res.status(201).json({ 
      review: {
        id: review.id,
        productId: review.productId,
        productName: targetProduct.name,
        productImage: b.productImage || '',
        rating: review.rating,
        title: review.title,
        body: review.body,
        images: review.images,
        isVerified: review.isVerified,
        createdAt: review.createdAt.toISOString()
      } 
    });
  } catch (err) {
    console.error('Review submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/customer/reviews/:id */
router.put('/:id', async (req, res) => {
  try {
    const r = await prisma.review.updateMany({
      where: { id: req.params.id, userId: req.user.userId },
      data: { rating: req.body?.rating, title: req.body?.title, body: req.body?.body, images: req.body?.images },
    });
    res.json({ ok: r.count > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/customer/reviews/:id */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.review.deleteMany({ where: { id: req.params.id, userId: req.user.userId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;