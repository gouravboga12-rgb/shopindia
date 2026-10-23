const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }      = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { calculateItemPricing } = require('../../lib/pricing');

const router = express.Router();
router.use(verifyToken, requirePermission('manage_products'));

/** GET /api/admin/products — FR-05.3 */
router.get('/', async (req, res) => {
  try {
    const { vendorId, status = 'active', page = 1, limit = 20, q } = req.query;
    const where = { status };
    if (vendorId) where.vendorId = vendorId;
    if (q)        where.name = { contains: q, mode: 'insensitive' };

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          vendor: { select: { businessName: true } },
          variants: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ products, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/products */
router.post('/', async (req, res) => {
  try {
    const { variants, images, ...data } = req.body;

    if (data.vendorPrice != null && Number(data.vendorPrice) > 0) {
      const pricing = await calculateItemPricing({
        vendorPrice: parseFloat(data.vendorPrice),
        mrp: data.mrp ? parseFloat(data.mrp) : null,
        context: { vendorId: data.vendorId, categoryId: data.categoryId }
      });
      data.basePrice = pricing.customerPrice;
      data.vendorPrice = pricing.vendorPrice;
    } else if (data.basePrice != null) {
      const pricing = await calculateItemPricing({
        basePrice: parseFloat(data.basePrice),
        mrp: data.mrp ? parseFloat(data.mrp) : null,
        context: { vendorId: data.vendorId, categoryId: data.categoryId }
      });
      data.vendorPrice = pricing.vendorPrice;
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        variants: variants && variants.length ? { create: variants } : undefined,
        images: images && images.length ? { create: images.map((url, i) => ({ url, displayOrder: i })) } : undefined,
      },
      include: { variants: true, images: true },
    });
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** PUT /api/admin/products/:id */
router.put('/:id', async (req, res) => {
  try {
    const { variants: _v, images: _i, vendor: _vd, ...data } = req.body;

    if (data.vendorPrice != null && Number(data.vendorPrice) > 0) {
      const pricing = await calculateItemPricing({
        vendorPrice: parseFloat(data.vendorPrice),
        mrp: data.mrp ? parseFloat(data.mrp) : null,
        context: { vendorId: data.vendorId, categoryId: data.categoryId }
      });
      data.basePrice = pricing.customerPrice;
      data.vendorPrice = pricing.vendorPrice;
    } else if (data.basePrice != null) {
      const pricing = await calculateItemPricing({
        basePrice: parseFloat(data.basePrice),
        mrp: data.mrp ? parseFloat(data.mrp) : null,
        context: { vendorId: data.vendorId, categoryId: data.categoryId }
      });
      data.vendorPrice = pricing.vendorPrice;
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { variants: true, images: true },
    });
    res.json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** DELETE /api/admin/products/:id — soft delete */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { status: 'deleted' },
    });
    res.json({ message: 'Product deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
