const express = require('express');
const multer = require('multer');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const { calculateItemPricing, invalidatePricingCache } = require('../../lib/pricing');
const { uploadToS3 } = require('../../lib/s3');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

const router = express.Router();
router.use(verifyToken, requirePermission('manage_products'));

/** GET /api/admin/products — Supports vertical filtering ('services' vs 'products') & order demand counts */
router.get('/', async (req, res) => {
  try {
    const { vendorId, status = 'active', page = 1, limit = 50, q, vertical, fulfillmentType } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (q) where.name = { contains: q, mode: 'insensitive' };

    // Vertical / Fulfillment Filtering
    if (fulfillmentType && fulfillmentType !== 'all') {
      where.fulfillmentType = fulfillmentType;
    } else if (vertical === 'services') {
      where.fulfillmentType = { in: ['hvac_service', 'hvac'] };
    } else if (vertical === 'products') {
      where.fulfillmentType = { in: ['traditional', 'quick_commerce'] };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          vendor: { select: { id: true, businessName: true, city: true } },
          category: { select: { id: true, name: true, vertical: true } },
          variants: true,
          images: true,
          _count: {
            select: { orderItems: true }
          }
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

/** POST /api/admin/products — Admin creation of products or services */
router.post('/', async (req, res) => {
  try {
    const { variants, images, ...data } = req.body;

    // Auto-assign master platform vendor if not specified by admin
    if (!data.vendorId) {
      const masterVendor = await prisma.vendor.findFirst({
        where: { approvalStatus: 'approved' },
        orderBy: { createdAt: 'asc' }
      });
      if (masterVendor) data.vendorId = masterVendor.id;
    }

    // Default stock for services if not provided
    if ((data.fulfillmentType === 'hvac_service' || data.fulfillmentType === 'hvac') && !data.stock) {
      data.stock = 999;
    }

    if (data.basePrice != null && data.vendorPrice != null && Number(data.basePrice) > 0 && Number(data.vendorPrice) > 0) {
      data.basePrice = parseFloat(data.basePrice);
      data.vendorPrice = parseFloat(data.vendorPrice);
    } else if (data.vendorPrice != null && Number(data.vendorPrice) > 0) {
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
        images: images && images.length ? {
          create: images.map((img, i) => ({
            url: typeof img === 'string' ? img : img.url,
            displayOrder: i
          }))
        } : undefined,
      },
      include: { variants: true, images: true, category: true, vendor: true },
    });

    invalidatePricingCache();
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** POST /api/admin/products/upload-images — Multi S3 Image Upload for Super Admin */
router.post('/upload-images', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) return res.status(400).json({ error: 'No image files provided.' });
    const uploadedUrls = [];
    for (const f of files) {
      const key = `services/admin/${Date.now()}-${Math.random().toString(36).substring(7)}-${f.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const result = await uploadToS3({
        key,
        body: f.buffer,
        contentType: f.mimetype,
        isPrivate: false,
      });
      uploadedUrls.push(result.url);
    }
    res.json({ urls: uploadedUrls });
  } catch (err) {
    console.error('[AdminProducts] Multi S3 upload error:', err);
    res.status(500).json({ error: err.message || 'Multiple S3 upload failed' });
  }
});

/** PUT /api/admin/products/:id */
router.put('/:id', async (req, res) => {
  try {
    const { variants: _v, images, vendor: _vd, category: _cat, _count: _cnt, ...data } = req.body;

    if (data.basePrice != null && data.vendorPrice != null && Number(data.basePrice) > 0 && Number(data.vendorPrice) > 0) {
      data.basePrice = parseFloat(data.basePrice);
      data.vendorPrice = parseFloat(data.vendorPrice);
    } else if (data.vendorPrice != null && Number(data.vendorPrice) > 0) {
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

    // Synchronize product images if images array is provided
    if (Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: req.params.id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((img, i) => ({
            productId: req.params.id,
            url: typeof img === 'string' ? img : img.url,
            displayOrder: i,
          }))
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { variants: true, images: true, category: true, vendor: true },
    });

    invalidatePricingCache();
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
    invalidatePricingCache();
    res.json({ message: 'Product deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
