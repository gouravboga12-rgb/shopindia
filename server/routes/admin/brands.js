const express = require('express');
const multer = require('multer');
const prisma = require('../../lib/prisma');
const { uploadToS3 } = require('../../lib/s3');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(verifyToken);
router.use(requireRole('super_admin', 'branch_manager'));

/**
 * POST /api/admin/brands/upload-logo
 * Uploads a brand logo to AWS S3
 */
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No logo image provided.' });
    const key = `brands/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const result = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      isPrivate: false,
    });
    res.json({ logoUrl: result.url });
  } catch (error) {
    console.error('Brand logo S3 upload error:', error);
    res.status(500).json({ error: error.message || 'S3 logo upload failed.' });
  }
});

/**
 * GET /api/admin/brands
 * Returns all brands for admin management
 */
router.get('/', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
    });
    res.json({ brands });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/brands
 * Create brand
 */
router.post('/', async (req, res) => {
  try {
    const { name, logo, description, isActive, isFeatured } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Brand name is required.' });
    }

    const trimmed = name.trim();
    const existing = await prisma.brand.findUnique({ where: { name: trimmed } });
    if (existing) {
      return res.status(400).json({ error: `Brand "${trimmed}" already exists.` });
    }

    const brand = await prisma.brand.create({
      data: {
        name: trimmed,
        slug: trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        logo: logo || null,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured !== undefined ? isFeatured : false
      }
    });

    res.status(201).json({ brand });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/brands/:id
 * Update brand
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, logo, description, isActive, isFeatured } = req.body;
    const data = {};
    if (name) {
      data.name = name.trim();
      data.slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    if (logo !== undefined) data.logo = logo;
    if (description !== undefined) data.description = description;
    if (isActive !== undefined) data.isActive = isActive;
    if (isFeatured !== undefined) data.isFeatured = isFeatured;

    const brand = await prisma.brand.update({
      where: { id: req.params.id },
      data
    });

    res.json({ brand });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/brands/:id/toggle
 * Toggle active state
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const current = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Brand not found' });
    const updated = await prisma.brand.update({
      where: { id: req.params.id },
      data: { isActive: !current.isActive }
    });
    res.json({ brand: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/brands/:id/featured
 * Toggle featured state
 */
router.patch('/:id/featured', async (req, res) => {
  try {
    const current = await prisma.brand.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Brand not found' });
    const updated = await prisma.brand.update({
      where: { id: req.params.id },
      data: { isFeatured: !current.isFeatured }
    });
    res.json({ brand: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/brands/:id
 * Delete brand
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.brand.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
