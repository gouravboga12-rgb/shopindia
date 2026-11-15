const express = require('express');
const multer = require('multer');
const { uploadToS3 } = require('../../lib/s3');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(verifyToken);
router.use(requireRole('super_admin', 'branch_manager'));

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// POST /api/admin/categories/upload-image
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    const key = `categories/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const result = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
      isPrivate: false,
    });
    res.json({ imageUrl: result.url });
  } catch (e) {
    console.error('S3 upload error:', e);
    res.status(500).json({ error: e.message || 'S3 upload failed' });
  }
});

const DEFAULT_QUICK_DEPARTMENTS = [
  { id: 'grocery', label: 'Instant Grocery', icon: '🥦', badge: '10 MINS', color: 'emerald', verticalKey: 'quick_grocery', tagline: '10-20 Min Delivery from Dark Store' },
  { id: 'food', label: 'Food & Dining', icon: '🍲', badge: 'LIVE KITCHENS', color: 'orange', verticalKey: 'quick_food', tagline: 'Hot & Fresh Meals from Verified Kitchens' },
  { id: 'pharmacy', label: 'Pharmacy', icon: '💊', badge: 'CERTIFIED PHARMA', color: 'blue', verticalKey: 'quick_pharmacy', tagline: 'Rx Medicines & Health Essentials' }
];

// GET /api/admin/categories/departments
router.get('/departments', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: 'quick_departments' } });
    let departments = DEFAULT_QUICK_DEPARTMENTS;
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) departments = parsed;
      } catch (_) {}
    }
    res.json({ success: true, departments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/categories/departments — add or update department
router.post('/departments', async (req, res) => {
  try {
    const { id, label, icon = '⚡', badge = 'INSTANT', color = 'purple', tagline = 'Quick Delivery' } = req.body;
    if (!label) return res.status(400).json({ error: 'Department label is required' });

    const rawId = id || slugify(label);
    const cleanId = rawId.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^quick_/, '');
    const verticalKey = `quick_${cleanId}`;

    const setting = await prisma.appSetting.findUnique({ where: { key: 'quick_departments' } });
    let departments = [...DEFAULT_QUICK_DEPARTMENTS];
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) departments = parsed;
      } catch (_) {}
    }

    const existingIdx = departments.findIndex(d => d.id === cleanId || d.verticalKey === verticalKey);
    const newDept = {
      id: cleanId,
      label,
      icon,
      badge: (badge || 'INSTANT').toUpperCase(),
      color,
      verticalKey,
      tagline,
      isCustom: !['grocery', 'food', 'pharmacy'].includes(cleanId)
    };

    if (existingIdx >= 0) {
      departments[existingIdx] = { ...departments[existingIdx], ...newDept };
    } else {
      departments.push(newDept);
    }

    await prisma.appSetting.upsert({
      where: { key: 'quick_departments' },
      update: { value: JSON.stringify(departments) },
      create: { key: 'quick_departments', value: JSON.stringify(departments) }
    });

    res.json({ success: true, department: newDept, departments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin/categories/departments/:id
router.delete('/departments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (['grocery', 'food', 'pharmacy'].includes(id)) {
      return res.status(400).json({ error: 'Core default departments (Grocery, Food, Pharmacy) cannot be deleted.' });
    }

    const setting = await prisma.appSetting.findUnique({ where: { key: 'quick_departments' } });
    if (!setting) return res.json({ success: true });

    let departments = JSON.parse(setting.value || '[]');
    departments = departments.filter(d => d.id !== id && d.verticalKey !== `quick_${id}`);

    await prisma.appSetting.update({
      where: { key: 'quick_departments' },
      data: { value: JSON.stringify(departments) }
    });

    res.json({ success: true, departments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/categories — list with product counts
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ vertical: 'asc' }, { sortOrder: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    res.json({ categories });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/admin/categories — create
router.post('/', async (req, res) => {
  try {
    const { name, vertical = 'shop', image, sortOrder = 0, slug } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    
    // Check duplicate
    const existing = await prisma.category.findFirst({ where: { name, vertical } });
    if (existing) return res.status(409).json({ error: `Category '${name}' already exists in '${vertical}'` });

    const category = await prisma.category.create({
      data: {
        name,
        vertical,
        image: image || null,
        sortOrder: Number(sortOrder || 0),
        slug: slug || slugify(name) || null,
      },
    });
    res.status(201).json({ category });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' });
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/admin/categories/:id — update
router.patch('/:id', async (req, res) => {
  try {
    const { name, vertical, image, sortOrder, slug } = req.body;
    
    if (name) {
      const checkVertical = vertical || (await prisma.category.findUnique({ where: { id: req.params.id } })).vertical;
      const existing = await prisma.category.findFirst({ where: { name, vertical: checkVertical, id: { not: req.params.id } } });
      if (existing) return res.status(409).json({ error: `Category '${name}' already exists in '${checkVertical}'` });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (vertical !== undefined) data.vertical = vertical;
    if (image !== undefined) data.image = image;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (slug !== undefined) data.slug = slug;
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json({ category });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/categories/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    });
    res.json({ category });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/admin/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.product.updateMany({ where: { categoryId: req.params.id }, data: { categoryId: null } });
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;