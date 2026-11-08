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

// Get active deals of the day for frontend
router.get('/deals-of-the-day', async (req, res) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'deals_of_the_day' }
    });
    let deals = null;
    if (setting && setting.value) {
      try {
        deals = JSON.parse(setting.value);
      } catch (e) {}
    }
    if (!deals) {
      const defaultShopProducts = await prisma.product.findMany({
        where: {
          status: 'active',
          fulfillmentType: 'traditional'
        },
        orderBy: [
          { mrp: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 6,
        select: { id: true }
      });

      deals = {
        isActive: true,
        showTimer: true,
        timerMode: 'midnight',
        customEndTime: '',
        title: 'Deals of the Day',
        badge: 'Limited Offer',
        productIds: defaultShopProducts.map(p => p.id)
      };
    } else {
      deals.showTimer = deals.showTimer !== false;
      deals.timerMode = deals.timerMode || 'midnight';
      deals.customEndTime = deals.customEndTime || '';
    }
    res.json({ deals });
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
