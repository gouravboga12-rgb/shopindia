const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

const DEFAULT_BRANDS = [
  { name: 'Apple', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apple.svg', isFeatured: true, isActive: true },
  { name: 'Samsung', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/samsung.svg', isFeatured: true, isActive: true },
  { name: 'boAt', logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text x="50" y="27" fill="%23E11D48" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="22" text-anchor="middle">bo<tspan fill="%23111827">A</tspan>t</text></svg>', isFeatured: true, isActive: true },
  { name: 'OnePlus', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/oneplus.svg', isFeatured: true, isActive: true },
  { name: "Levi's", logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><path fill="%23C41230" d="M0 0h100v28c-12 8-28 12-50 12s-38-4-50-12V0z"/><text x="50" y="24" fill="white" font-family="Arial,sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="1">LEVI%27S</text></svg>', isFeatured: true, isActive: true },
  { name: 'Nike', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nike.svg', isFeatured: true, isActive: true },
  { name: 'Sony', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/sony.svg', isFeatured: true, isActive: true },
  { name: 'Puma', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/puma.svg', isFeatured: true, isActive: true },
  { name: 'Wildcraft', logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><text x="60" y="26" fill="%23D97706" font-family="Arial,sans-serif" font-weight="900" font-size="15" text-anchor="middle" letter-spacing="1.5">WILDCRAFT</text></svg>', isFeatured: true, isActive: true },
  { name: 'LEGO', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/lego.svg', isFeatured: true, isActive: true },
  { name: 'Voltas', logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text x="50" y="26" fill="%230284C7" font-family="Arial,sans-serif" font-weight="900" font-size="17" text-anchor="middle" letter-spacing="2">VOLTAS</text></svg>', isFeatured: true, isActive: true },
  { name: 'Amul', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Amul_official_logo.svg', isFeatured: true, isActive: true },
  { name: 'Tata', logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/tata.svg', isFeatured: true, isActive: true },
];

/**
 * GET /api/brands
 * Public endpoint for storefront and vendor dropdowns.
 * Returns active brands. Seeds defaults on first call if table is empty.
 */
router.get('/', async (req, res) => {
  try {
    let brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }]
    });

    if (brands.length === 0) {
      try {
        for (const b of DEFAULT_BRANDS) {
          await prisma.brand.upsert({
            where: { name: b.name },
            update: {},
            create: {
              name: b.name,
              logo: b.logo,
              isFeatured: b.isFeatured,
              isActive: b.isActive,
              slug: b.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
            }
          });
        }
        brands = await prisma.brand.findMany({
          where: { isActive: true },
          orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }]
        });
      } catch (seedErr) {
        console.warn('Auto-seeding default brands error:', seedErr.message);
      }
    }

    res.json({ brands });
  } catch (err) {
    console.error('Fetch brands error:', err);
    res.status(500).json({ error: err.message, brands: DEFAULT_BRANDS });
  }
});

module.exports = router;
