const express = require('express');
const multer  = require('multer');
const prisma  = require('../../lib/prisma');
const { uploadToS3 }   = require('../../lib/s3');
const { verifyToken }  = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/rbac');
const { calculateItemPricing } = require('../../lib/pricing');

const router = express.Router();
router.use(verifyToken, requireRole('vendor'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** POST /api/vendor/products/preview-price — Live preview of customer price & commission */
router.post('/preview-price', async (req, res) => {
  try {
    const { vendorPrice, basePrice, mrp, categoryId } = req.body;
    const pricing = await calculateItemPricing({
      vendorPrice: vendorPrice != null ? parseFloat(vendorPrice) : undefined,
      basePrice: basePrice != null ? parseFloat(basePrice) : undefined,
      mrp: mrp ? parseFloat(mrp) : null,
      context: { vendorId: req.user.vendorId, categoryId }
    });
    res.json({ success: true, pricing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/vendor/products — FR-02.2: Vendor's own products */
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 100, q, channel } = req.query;
    const where = { vendorId: req.user.vendorId };
    if (status) where.status = status;
    else where.status = { not: 'deleted' };
    if (q) where.name = { contains: q, mode: 'insensitive' };

    // Strict filter: vendor goods catalog ONLY allows 'traditional' and 'quick_commerce'
    // Doorstep services ('hvac_service', etc.) are excluded from vendor retail catalog
    if (channel === 'traditional' || channel === 'quick_commerce') {
      where.fulfillmentType = channel;
    } else {
      where.fulfillmentType = { in: ['traditional', 'quick_commerce'] };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [products, total, traditionalCount, quickCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { variants: true, images: true, category: true },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.product.count({ where }),
      prisma.product.count({
        where: {
          vendorId: req.user.vendorId,
          status: { not: 'deleted' },
          fulfillmentType: 'traditional',
        },
      }),
      prisma.product.count({
        where: {
          vendorId: req.user.vendorId,
          status: { not: 'deleted' },
          fulfillmentType: 'quick_commerce',
        },
      }),
    ]);
    res.json({
      products,
      total,
      traditionalCount,
      quickCount,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/vendor/products/:id */
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
      include: { variants: true, images: true },
    });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/vendor/products */
router.post('/', async (req, res) => {
  try {
    const { variants, images, ...data } = req.body;
    if (data.fulfillmentType && !['traditional', 'quick_commerce'].includes(data.fulfillmentType)) {
      data.fulfillmentType = 'traditional';
    }

    // Apply central pricing engine calculation
    if (data.vendorPrice != null && Number(data.vendorPrice) > 0) {
      const pricing = await calculateItemPricing({
        vendorPrice: parseFloat(data.vendorPrice),
        mrp: data.mrp ? parseFloat(data.mrp) : null,
        context: { vendorId: req.user.vendorId, categoryId: data.categoryId }
      });

      if (data.mrp && pricing.customerPrice > data.mrp) {
        return res.status(400).json({
          error: `Customer price (₹${pricing.customerPrice}) exceeds MRP (₹${data.mrp}). Please reduce your base payout price or increase MRP.`
        });
      }

      data.basePrice = pricing.customerPrice; // Customer storefront price
      data.vendorPrice = pricing.vendorPrice; // Vendor net payout per unit
    } else if (data.basePrice != null) {
      const pricing = await calculateItemPricing({
        basePrice: parseFloat(data.basePrice),
        mrp: data.mrp ? parseFloat(data.mrp) : null,
        context: { vendorId: req.user.vendorId, categoryId: data.categoryId }
      });
      data.vendorPrice = pricing.vendorPrice;
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        vendorId: req.user.vendorId,
        variants: variants && variants.length ? { create: variants } : undefined,
        images: images && images.length ? { create: images.map((url, i) => ({ url, displayOrder: i })) } : undefined,
      },
      include: { variants: true, images: true },
    });
    res.status(201).json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** POST /api/vendor/products/upload-image — S3 Image Upload */
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
    const key = `products/${req.user.vendorId}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const result = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      isPrivate: false,
    });
    res.json({ url: result.url, key });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ error: err.message || 'S3 upload failed' });
  }
});

/** POST /api/vendor/products/upload-images — Multiple S3 Images Upload */
router.post('/upload-images', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) return res.status(400).json({ error: 'No image files provided.' });
    const uploadedUrls = [];
    for (const f of files) {
      const key = `products/${req.user.vendorId}/${Date.now()}-${Math.random().toString(36).substring(7)}-${f.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
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
    console.error('Multi S3 upload error:', err);
    res.status(500).json({ error: err.message || 'Multiple S3 upload failed' });
  }
});

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, WebM, MOV, etc.) are allowed.'));
    }
  }
});

/** POST /api/vendor/products/upload-video — S3 Video Upload (up to 100MB) */
router.post('/upload-video', (req, res, next) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Video file size exceeds 100MB limit. Please compress or select a smaller video.' });
      }
      return res.status(400).json({ error: err.message || 'Video upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file provided.' });
    const ext = req.file.originalname.split('.').pop() || 'mp4';
    const key = `products/${req.user.vendorId || 'common'}/videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const result = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      isPrivate: false,
    });
    res.json({ url: result.url });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ error: err.message || 'Video upload failed' });
  }
});

/** PUT /api/vendor/products/:id */
router.put('/:id', async (req, res) => {
  try {
    const { variants: _v, images, ...data } = req.body;
    if (data.fulfillmentType && !['traditional', 'quick_commerce'].includes(data.fulfillmentType)) {
      data.fulfillmentType = 'traditional';
    }
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    // Apply central pricing engine calculation
    if (data.vendorPrice != null && Number(data.vendorPrice) > 0) {
      const pricing = await calculateItemPricing({
        vendorPrice: parseFloat(data.vendorPrice),
        mrp: data.mrp ? parseFloat(data.mrp) : existing.mrp,
        context: { vendorId: req.user.vendorId, categoryId: data.categoryId || existing.categoryId }
      });

      const effectiveMrp = data.mrp ? parseFloat(data.mrp) : existing.mrp;
      if (effectiveMrp && pricing.customerPrice > effectiveMrp) {
        return res.status(400).json({
          error: `Customer price (₹${pricing.customerPrice}) exceeds MRP (₹${effectiveMrp}). Please reduce your base payout price or increase MRP.`
        });
      }

      data.basePrice = pricing.customerPrice;
      data.vendorPrice = pricing.vendorPrice;
    } else if (data.basePrice != null) {
      const pricing = await calculateItemPricing({
        basePrice: parseFloat(data.basePrice),
        mrp: data.mrp ? parseFloat(data.mrp) : existing.mrp,
        context: { vendorId: req.user.vendorId, categoryId: data.categoryId || existing.categoryId }
      });
      data.vendorPrice = pricing.vendorPrice;
    }

    if (Array.isArray(images)) {
      await prisma.productImage.deleteMany({ where: { productId: req.params.id } });
      if (images.length > 0) {
        await prisma.productImage.createMany({
          data: images.map((url, i) => ({ productId: req.params.id, url, displayOrder: i }))
        });
      }
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { variants: true, images: true },
    });
    res.json(product);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** PATCH /api/vendor/products/:id/stock — toggle out-of-stock */
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stock, isOutOfStock } = req.body;
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const data = {};
    if (stock !== undefined) {
      data.stock = stock;
      data.isOutOfStock = stock <= 0;
    } else if (isOutOfStock !== undefined) {
      data.isOutOfStock = isOutOfStock;
      if (!isOutOfStock && existing.stock <= 0) {
        data.stock = 1;
      }
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { variants: true, images: true },
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** DELETE /api/vendor/products/:id — soft delete */
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, vendorId: req.user.vendorId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    await prisma.product.update({
      where: { id: req.params.id },
      data: { status: 'deleted' },
    });
    res.json({ message: 'Product deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
