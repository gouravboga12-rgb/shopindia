const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken);
router.use(requireRole('vendor'));

// Get all technicians for the logged in vendor
router.get('/', async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const technicians = await prisma.technician.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ technicians });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// GET /api/vendor/technicians/partners
// List platform verified service professionals & technicians available for doorstep bookings
router.get('/partners', async (req, res) => {
  try {
    const { skill } = req.query;
    const where = {
      partnerType: { in: ['service', 'both'] },
      isApproved: true,
      isActive: true,
    };
    if (skill) {
      where.skills = { has: skill };
    }

    const partners = await prisma.riderProfile.findMany({
      where,
      select: {
        id: true,
        partnerType: true,
        skills: true,
        experienceYears: true,
        rating: true,
        totalDeliveries: true,
        isOnline: true,
        address: true,
        currentLat: true,
        currentLng: true,
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
      take: 50,
    });

    res.json({ partners });
  } catch (error) {
    console.error('Error fetching platform service partners:', error);
    res.status(500).json({ error: 'Failed to fetch platform service partners' });
  }
});

// Create new technician
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, skills } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const technician = await prisma.technician.create({
      data: {
        vendorId: vendor.id,
        name,
        phone,
        email,
        skills: skills ? skills.split(',').map(s => s.trim()) : []
      }
    });

    res.json({ technician });
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

// Update technician status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStatus, isActive } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
    
    const technician = await prisma.technician.findUnique({ where: { id } });
    if (!technician || technician.vendorId !== vendor.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.technician.update({
      where: { id },
      data: {
        ...(currentStatus && { currentStatus }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({ technician: updated, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
