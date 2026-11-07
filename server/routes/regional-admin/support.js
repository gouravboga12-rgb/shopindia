const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(verifyToken, requireRole('regional_admin', 'branch_manager', 'super_admin'));

function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper to fetch regional admin profile for logged-in user
 */
async function getRegionalProfile(userId) {
  if (!userId) return null;
  return await prisma.regionalAdminProfile.findUnique({
    where: { userId }
  });
}

/**
 * GET /api/regional-admin/support/tickets
 * Tickets in this regional manager's territory
 */
router.get('/tickets', async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const profile = await getRegionalProfile(userId);
    if (!profile && req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Regional admin profile not found' });
    }

    const { status, tier, priority, page = 1, limit = 25 } = req.query;
    
    // Find tickets assigned directly to this region OR matching assigned pincodes OR nearby vendors
    const where = {};
    if (profile) {
      const orConditions = [
        { regionId: profile.id },
        {
          order: {
            deliveryPincode: { in: profile.assignedPincodes || [] }
          }
        },
        {
          order: {
            vendor: {
              pincode: { in: profile.assignedPincodes || [] }
            }
          }
        }
      ];

      // Also check vendors within regional admin's radius
      if (profile.currentLat && profile.currentLng) {
        const allVendors = await prisma.vendor.findMany({
          where: { lat: { not: null }, lng: { not: null } },
          select: { id: true, lat: true, lng: true }
        });
        const nearbyVendorIds = allVendors
          .filter(v => getHaversineDistanceKm(profile.currentLat, profile.currentLng, v.lat, v.lng) <= 25)
          .map(v => v.id);

        if (nearbyVendorIds.length > 0) {
          orConditions.push({ vendorId: { in: nearbyVendorIds } });
          orConditions.push({ order: { vendorId: { in: nearbyVendorIds } } });
        }
      }

      where.OR = orConditions;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (tier) where.tier = Number(tier);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              subtotal: true,
              discount: true,
              status: true,
              paymentMethod: true,
              paymentStatus: true,
              refundAmount: true,
              refundReason: true,
              refundedAt: true,
              deliveryLine1: true,
              deliveryLine2: true,
              deliveryCity: true,
              deliveryState: true,
              deliveryPincode: true,
              vendor: {
                select: {
                  id: true,
                  businessName: true,
                  phone: true,
                  city: true,
                  street: true,
                }
              },
              items: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  quantity: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      images: { select: { url: true }, take: 1 }
                    }
                  }
                }
              },
              delivery: {
                select: {
                  status: true,
                  distanceKm: true,
                  riderProfile: {
                    select: {
                      user: { select: { name: true, phone: true } }
                    }
                  }
                }
              }
            }
          },
          messages: { orderBy: { sentAt: 'asc' } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.ticket.count({ where })
    ]);

    // Fetch vendor details for any ticket having vendorId
    const vendorIds = [...new Set(tickets.map(t => t.vendorId).filter(Boolean))];
    const vendors = vendorIds.length > 0 ? await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: {
        id: true,
        businessName: true,
        city: true,
        phone: true,
        user: { select: { name: true, email: true, phone: true } }
      }
    }) : [];
    const vendorMap = new Map(vendors.map(v => [v.id, v]));

    const now = new Date();
    const enriched = tickets.map(t => {
      let slaRemainingMinutes = null;
      let isBreached = false;
      if (t.slaDeadline) {
        const diffMs = new Date(t.slaDeadline).getTime() - now.getTime();
        slaRemainingMinutes = Math.round(diffMs / 60000);
        isBreached = slaRemainingMinutes <= 0 && t.status !== 'resolved' && t.status !== 'closed';
      }
      return {
        ...t,
        vendor: t.vendorId ? vendorMap.get(t.vendorId) || null : null,
        slaRemainingMinutes,
        isBreached
      };
    });

    res.json({
      success: true,
      tickets: enriched,
      total,
      regionName: profile.regionName,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('[RegionalSupport] Error fetching tickets:', err);
    res.status(500).json({ error: 'Failed to fetch regional tickets' });
  }
});

/**
 * GET /api/regional-admin/support/tickets/:id
 */
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            subtotal: true,
            discount: true,
            status: true,
            paymentMethod: true,
            paymentStatus: true,
            refundAmount: true,
            refundReason: true,
            refundedAt: true,
            deliveryLine1: true,
            deliveryLine2: true,
            deliveryCity: true,
            deliveryState: true,
            deliveryPincode: true,
            vendor: {
              select: {
                id: true,
                businessName: true,
                phone: true,
                city: true,
                street: true,
              }
            },
            items: {
              select: {
                id: true,
                name: true,
                price: true,
                quantity: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: { select: { url: true }, take: 1 }
                  }
                }
              }
            },
            delivery: {
              select: {
                status: true,
                distanceKm: true,
                riderProfile: {
                  select: {
                    user: { select: { name: true, phone: true } }
                  }
                }
              }
            }
          }
        },
        messages: { orderBy: { sentAt: 'asc' } }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    let vendor = null;
    if (ticket.vendorId) {
      vendor = await prisma.vendor.findUnique({
        where: { id: ticket.vendorId },
        select: { id: true, businessName: true, phone: true, city: true, user: { select: { name: true, email: true, phone: true } } }
      });
    }
    res.json({ success: true, ticket: { ...ticket, vendor } });
  } catch (err) {
    console.error('[RegionalSupport] Error loading ticket:', err);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
});

/**
 * POST /api/regional-admin/support/tickets/:id/reply
 */
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Reply text cannot be empty' });

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: req.params.id,
        senderRole: 'regional_admin',
        text: text.trim(),
        sentAt: new Date()
      }
    });

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: 'in_progress' },
      include: { messages: { orderBy: { sentAt: 'asc' } } }
    });

    // In-App Alert Notification to Customer
    if (ticket.customerId) {
      const preview = text.trim().length > 100 ? text.trim().slice(0, 100) + '...' : text.trim();
      await prisma.userNotification.create({
        data: {
          userId: ticket.customerId,
          category: 'order',
          title: `Regional Support Replied #${ticket.ticketNumber} 💬`,
          message: `Regional Manager: "${preview}"`,
          channel: 'IN_APP',
          isRead: false,
          link: '/dashboard?tab=support'
        }
      }).catch(err => console.error('Regional admin reply userNotification error:', err));
    }

    res.json({ success: true, message, ticket });
  } catch (err) {
    console.error('[RegionalSupport] Reply error:', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

/**
 * POST /api/regional-admin/support/tickets/:id/internal-note
 */
router.post('/tickets/:id/internal-note', async (req, res) => {
  try {
    const { note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ error: 'Note is required' });

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        internalNotes: `${ticket.internalNotes ? ticket.internalNotes + '\n' : ''}[Regional Manager Note (${new Date().toLocaleTimeString()}): ${note.trim()}]`
      }
    });

    res.json({ success: true, internalNotes: updated.internalNotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/regional-admin/support/tickets/:id/escalate
 * Manually escalate to Tier 3 (Super Admin)
 */
router.post('/tickets/:id/escalate', async (req, res) => {
  try {
    const { reason } = req.body;
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        tier: 3,
        escalatedAt: new Date(),
        priority: 'urgent',
        internalNotes: `${existing.internalNotes ? existing.internalNotes + '\n' : ''}[Escalated to Super Admin: ${reason || 'Regional intervention needed'}]`
      }
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: 'system',
        text: `🚨 Ticket escalated to Super Admin Executive Queue. Reason: ${reason || 'Territory manager escalation'}.`,
        sentAt: new Date()
      }
    });

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
