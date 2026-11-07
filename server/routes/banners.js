const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get active spotlight promo for frontend
router.get('/spotlight', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'spotlight_brand_promo' }
    });
    if (setting && setting.value) {
      try {
        const parsed = JSON.parse(setting.value);
        return res.json({ spotlight: parsed });
      } catch (e) {}
    }
    // Default fallback
    res.json({
      spotlight: {
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
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active banners for frontend
router.get('/', async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ banners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
