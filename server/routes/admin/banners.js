const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const { uploadToS3 } = require('../../lib/s3');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(verifyToken);
router.use(requireRole('super_admin', 'branch_manager'));

// Upload image to S3
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const key = `banners/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const result = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      isPrivate: false,
    });
    res.json({ imageUrl: result.url });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ error: error.message || 'S3 upload failed' });
  }
});

// Get all banners
router.get('/', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ banners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create banner
router.post('/', async (req, res) => {
  try {
    const { title, subtitle, image, vertical, isActive } = req.body;
    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle,
        image,
        vertical: vertical || 'shop',
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.status(201).json({ banner });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update banner
router.put('/:id', async (req, res) => {
  try {
    const { title, subtitle, image, vertical, isActive } = req.body;
    const banner = await prisma.banner.update({
      where: { id: req.params.id },
      data: { title, subtitle, image, vertical, isActive }
    });
    res.json({ banner });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete banner
router.delete('/:id', async (req, res) => {
  try {
    await prisma.banner.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const existing = await prisma.banner.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    
    const banner = await prisma.banner.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive }
    });
    res.json({ banner });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/admin/banners/spotlight
router.get('/spotlight', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'spotlight_brand_promo' }
    });
    let spotlight = null;
    if (setting && setting.value) {
      try { spotlight = JSON.parse(setting.value); } catch (e) {}
    }
    if (!spotlight) {
      spotlight = {
        badge: 'Partnership',
        title: 'Active Jordan series',
        subtitle: 'Claim premium cashbacks instantly.',
        actionText: 'Shop Now',
        actionLink: 'shoes',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format',
        partnerTitle: 'Plus Guaranteed Partner',
        partnerSub: '1-day fast delivery',
        partnerNote: 'Enjoy 1-day delivery and special discount prices on items displaying the ShopIndia Assured badge.',
        isActive: true
      };
    }
    res.json({ spotlight });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/banners/spotlight
router.post('/spotlight', async (req, res) => {
  try {
    const data = req.body;
    const value = JSON.stringify(data);
    await prisma.appSetting.upsert({
      where: { key: 'spotlight_brand_promo' },
      update: { value, updatedAt: new Date(), updatedBy: req.user?.id || req.user?.userId },
      create: { key: 'spotlight_brand_promo', value, description: 'Storefront right sidebar spotlight brand promotion', updatedBy: req.user?.id || req.user?.userId }
    });
    res.json({ success: true, spotlight: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/banners/deals
router.get('/deals', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'deals_of_the_day' }
    });
    let deals = null;
    if (setting && setting.value) {
      try { deals = JSON.parse(setting.value); } catch (e) {}
    }
    
    // If not configured or productIds is empty, auto-populate with the top active discounted storefront products
    if (!deals || !Array.isArray(deals.productIds) || deals.productIds.length === 0) {
      // Find top active shop products to feature by default
      const defaultShopProducts = await prisma.product.findMany({
        where: {
          status: 'active',
          fulfillmentType: { in: ['traditional', 'shop'] }
        },
        orderBy: [
          { mrp: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 6,
        select: { id: true }
      });

      const initialProductIds = defaultShopProducts.map(p => p.id);

      deals = {
        isActive: deals ? deals.isActive !== false : true,
        title: deals?.title || 'Deals of the Day',
        badge: deals?.badge || 'Limited Offer',
        productIds: initialProductIds
      };

      // Persist the default curated list into appSetting so both Admin and Storefront are in 100% sync
      if (initialProductIds.length > 0) {
        await prisma.appSetting.upsert({
          where: { key: 'deals_of_the_day' },
          update: { value: JSON.stringify(deals) },
          create: {
            key: 'deals_of_the_day',
            value: JSON.stringify(deals),
            description: 'Homepage Deals of the Day / Limited Offers curated products'
          }
        }).catch(err => console.warn('Failed to persist default deals:', err.message));
      }
    }

    res.json({ deals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/banners/deals
router.post('/deals', async (req, res) => {
  try {
    const data = req.body;
    const value = JSON.stringify(data);
    await prisma.appSetting.upsert({
      where: { key: 'deals_of_the_day' },
      update: { value, updatedAt: new Date(), updatedBy: req.user?.id || req.user?.userId },
      create: {
        key: 'deals_of_the_day',
        value,
        description: 'Homepage Deals of the Day / Limited Offers curated products',
        updatedBy: req.user?.id || req.user?.userId
      }
    });
    res.json({ success: true, deals: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
