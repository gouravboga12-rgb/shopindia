const express = require('express');
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper to calculate Haversine distance in km
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

// Helper to extract and VERIFY authenticated user ID from JWT
const getVerifiedUserId = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded?.id || decoded?.userId || decoded?.sub || null;
    }
  } catch (e) {
    // Invalid or expired token
  }
  return null;
};

// Legacy helper kept for backward compatibility in ticket creation only (uses decode not verify)
const getOptionalUserId = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);
      return decoded?.id || decoded?.userId || decoded?.sub || null;
    }
  } catch (e) {
    // Ignore invalid token
  }
  return null;
};

// Comprehensive Support FAQ Knowledge Base across Verticals
const DEFAULT_SUPPORT_FAQS = [
  // ── Shop India Ecommerce ──
  {
    id: 'shopindia_delivery_time',
    category: 'Shop India',
    vertical: 'shop',
    question: 'When will my Shop India order be delivered?',
    answer: 'Standard Shop India orders are dispatched via our verified logistics partners and delivered within 2 to 5 business working days depending on your pin code. You will receive live SMS and tracking updates as soon as your package is dispatched.',
    canRaiseTicket: false
  },
  {
    id: 'shopindia_cancel_modify',
    category: 'Shop India',
    vertical: 'shop',
    question: 'Can I cancel or modify my Shop India order?',
    answer: 'Yes! You can cancel your order directly from "Orders > Order Details > Cancel Order" before it is packed or dispatched. Once dispatched, you can initiate a return or exchange upon delivery.',
    canRaiseTicket: true,
    ticketSubject: 'Request to Cancel / Modify Shop India Order'
  },
  {
    id: 'shopindia_damaged_wrong_item',
    category: 'Shop India',
    vertical: 'shop',
    question: 'What if an item is damaged or wrong product delivered?',
    answer: 'We sincerely apologize if you received a defective or incorrect item. Please submit a support ticket on the left panel within 48 hours of delivery with item details. Our superiors and resolution team will review and arrange a free replacement or full refund within 2 to 4 business working days.',
    canRaiseTicket: true,
    ticketSubject: 'Damaged or Wrong Item Received'
  },

  // ── Quick Shopping (10-20 Min Express) ──
  {
    id: 'quick_delivery_time',
    category: 'Quick Shopping',
    vertical: 'quick',
    question: 'How fast is Quick Shopping delivery?',
    answer: 'Quick Shopping grocery and food orders are delivered within 10 to 20 minutes from our nearest local dark stores and vendor hubs by dedicated express delivery partners.',
    canRaiseTicket: false
  },
  {
    id: 'quick_missing_item',
    category: 'Quick Shopping',
    vertical: 'quick',
    question: 'An item is missing or spoiled in my Quick order?',
    answer: 'We sincerely apologize. For express grocery and food orders, please raise a ticket using the "Raise a Support Ticket" form on the left. Our support desk will review and issue an instant refund or arrange a priority re-dispatch.',
    canRaiseTicket: true,
    ticketSubject: 'Missing or Spoiled Item in Quick Order'
  },
  {
    id: 'quick_change_address',
    category: 'Quick Shopping',
    vertical: 'quick',
    question: 'Can I change delivery address after placing Quick order?',
    answer: 'Because Quick orders are packed and dispatched in under 3 minutes, addresses cannot be changed once confirmed. If your rider has already picked up the order, you can contact the rider directly via the order tracking screen.',
    canRaiseTicket: true,
    ticketSubject: 'Address Issue on Express Delivery'
  },

  // ── Glacons Services ──
  {
    id: 'glacons_warranty',
    category: 'Glacons Services',
    vertical: 'services',
    question: 'Is there a warranty or guarantee on Glacons repairs?',
    answer: 'Yes! All appliance and home services booked through ShopIndia include a complete 30-Day Guarantee. If you experience any issues with the serviced appliance within 30 days, we provide a 100% free technician revisit.',
    canRaiseTicket: false
  },
  {
    id: 'glacons_reschedule',
    category: 'Glacons Services',
    vertical: 'services',
    question: 'How do I reschedule a technician service slot?',
    answer: 'You can reschedule your technician booking free of charge up to 2 hours before the scheduled appointment. Contact your assigned service professional directly or raise a ticket on the left with your preferred new date and time slot.',
    canRaiseTicket: true,
    ticketSubject: 'Reschedule Glacons Service Appointment'
  },
  {
    id: 'glacons_pricing_charges',
    category: 'Glacons Services',
    vertical: 'services',
    question: 'How are Glacons technician charges calculated?',
    answer: 'We follow transparent, standardized rate cards. Standard inspection charges are clearly shown upfront. Any additional spare parts or special requirements will be quoted and approved by you before the technician begins work.',
    canRaiseTicket: false
  },

  // ── Payments & Refunds ──
  {
    id: 'refund_timeline',
    category: 'Refunds & Payments',
    vertical: 'general',
    question: 'How long does a refund take to reach my bank account?',
    answer: 'Once approved, refunds are credited back to your original payment method (UPI / Cards / Netbanking) within 2 to 4 business working days. UPI and wallet refunds typically reflect within 2 to 4 hours.',
    canRaiseTicket: true,
    ticketSubject: 'Refund Inquiry / Delay'
  },
  {
    id: 'payment_debited_order_failed',
    category: 'Refunds & Payments',
    vertical: 'general',
    question: 'Payment was debited but order shows failed / not placed?',
    answer: 'Do not worry! In case of a bank network timeout, the amount is automatically reversed by your bank within 24 to 48 hours. If the amount is not credited after 48 hours, please raise a ticket on the left with your payment reference / UTR number.',
    canRaiseTicket: true,
    ticketSubject: 'Payment Debited but Order Not Placed'
  },

  // ── Ticket Escalation & Management ──
  {
    id: 'escalate_to_superiors',
    category: 'Superiors & Tickets',
    vertical: 'general',
    question: 'How do I escalate an issue to Shop India superiors or management?',
    answer: 'To ensure formal management tracking and priority review, please submit your complaint using the "Raise a Support Ticket" form on the left. Higher-level support executives and desk supervisors review all escalated tickets and resolve them within 2 to 4 business working days.',
    canRaiseTicket: true,
    ticketSubject: 'Escalation to Management / Senior Desk'
  }
];

// Helper to get active FAQs from DB (or fallback)
async function getStoredSupportFaqs() {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: 'support_chat_faqs' }
    });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[SUPPORT] Could not read support_chat_faqs from appSetting:', err.message);
  }
  return DEFAULT_SUPPORT_FAQS;
}

/**
 * GET /api/support/faqs - Retrieve active support chat questions and answers
 */
router.get('/faqs', async (_req, res) => {
  try {
    const faqs = await getStoredSupportFaqs();
    res.json({ faqs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve FAQs' });
  }
});

/**
 * GET /api/admin/support/faqs - Super Admin view of all FAQs
 */
router.get('/admin/faqs', async (_req, res) => {
  try {
    const faqs = await getStoredSupportFaqs();
    res.json({ faqs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve admin FAQs' });
  }
});

/**
 * PUT /api/admin/support/faqs - Super Admin update of FAQs
 */
router.put('/admin/faqs', async (req, res) => {
  try {
    const { faqs } = req.body;
    if (!Array.isArray(faqs)) {
      return res.status(400).json({ error: 'faqs must be an array' });
    }

    const jsonStr = JSON.stringify(faqs);
    await prisma.appSetting.upsert({
      where: { key: 'support_chat_faqs' },
      update: { value: jsonStr, updatedAt: new Date() },
      create: {
        key: 'support_chat_faqs',
        value: jsonStr,
        description: 'Support Chat FAQ Knowledge Base and Category QA'
      }
    });

    res.json({ success: true, count: faqs.length });
  } catch (err) {
    console.error('[SUPPORT] Failed to save FAQs:', err);
    res.status(500).json({ error: 'Failed to save FAQs to database' });
  }
});

/**
 * GET /api/support/chat/history - Retrieve persistent chat history for customer
 */
router.get('/chat/history', async (req, res) => {
  try {
    const customerId = getVerifiedUserId(req) || getOptionalUserId(req);
    if (!customerId) {
      return res.json({
        messages: [
          { from: 'agent', text: 'Hi! 👋 Welcome to ShopIndia Live Support. How can we help you today?' }
        ],
        isAgentConnected: false,
        sessionNumber: null
      });
    }

    const liveTicket = await prisma.ticket.findFirst({
      where: {
        customerId,
        subject: { startsWith: '[LIVE CHAT' },
        status: { not: 'closed' }
      },
      include: {
        messages: { orderBy: { sentAt: 'asc' } },
        assignedTo: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!liveTicket || !liveTicket.messages || liveTicket.messages.length === 0) {
      return res.json({
        messages: [
          { from: 'agent', text: 'Hi! 👋 Welcome to ShopIndia Live Support. How can we help you today?' }
        ],
        isAgentConnected: false,
        sessionNumber: null
      });
    }

    const hasAgent = liveTicket.messages.some(m => m.senderRole !== 'customer' && m.senderRole !== 'bot');
    const agentName = liveTicket.assignedTo?.name || 'Support Specialist';

    const formattedMessages = liveTicket.messages.map(m => {
      const isMe = m.senderRole === 'customer';
      let senderLabel = undefined;
      if (!isMe) {
        if (m.senderRole === 'bot') senderLabel = 'ShopIndia Assistant';
        else if (m.senderRole === 'regional_admin') senderLabel = 'Regional Support';
        else if (m.senderRole === 'vendor') senderLabel = 'Merchant';
        else senderLabel = agentName;
      }

      return {
        id: m.id,
        from: isMe ? 'me' : 'agent',
        senderRole: m.senderRole,
        senderLabel,
        text: m.text,
        time: new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    });

    res.json({
      sessionId: liveTicket.id,
      sessionNumber: liveTicket.ticketNumber,
      isAgentConnected: hasAgent,
      agentName: hasAgent ? agentName : null,
      status: liveTicket.status,
      messages: formattedMessages
    });
  } catch (err) {
    console.error('Fetch chat history error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/support/chat - Interactive AI / Auto-help query with live order data & DB persistence
 */
router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const lowerQuery = query.toLowerCase().trim();
    let customerId = getVerifiedUserId(req) || getOptionalUserId(req);

    // If customer is not authenticated, fallback to guest or find first user
    if (!customerId) {
      const guest = await prisma.user.findFirst({ where: { role: 'customer' } });
      if (guest) customerId = guest.id;
    }

    // Find or create active Live Chat Ticket in DB for persistence
    let liveTicket = null;
    if (customerId) {
      liveTicket = await prisma.ticket.findFirst({
        where: {
          customerId,
          subject: { startsWith: '[LIVE CHAT' },
          status: { not: 'closed' }
        }
      });

      if (!liveTicket) {
        liveTicket = await prisma.ticket.create({
          data: {
            ticketNumber: 'CHAT-' + Math.floor(100000 + Math.random() * 900000),
            customerId,
            subject: `[LIVE CHAT] Customer Support Session`,
            category: 'other',
            priority: 'medium',
            status: 'open'
          }
        });
      }

      // Record customer's message in database
      await prisma.ticketMessage.create({
        data: {
          ticketId: liveTicket.id,
          senderRole: 'customer',
          text: query.trim()
        }
      });
    }

    let answer = '';
    let isEscalated = false;

    // 1. ORDER & DELIVERY TRACKING QUERIES
    if (
      lowerQuery.includes('track') ||
      lowerQuery.includes('delivery') ||
      lowerQuery.includes('where is my order') ||
      lowerQuery.includes('order status') ||
      lowerQuery.includes('eta')
    ) {
      let latestOrder = null;
      if (customerId) {
        latestOrder = await prisma.order.findFirst({
          where: { customerId },
          orderBy: { createdAt: 'desc' },
          include: {
            items: { include: { product: { select: { name: true, fulfillmentType: true } } } },
            riderDeliveries: {
              include: { rider: { select: { user: { select: { name: true, phone: true } } } } }
            }
          }
        });
      }

      if (latestOrder) {
        const itemNames = latestOrder.items.map(i => i.product?.name || 'Item').slice(0, 2).join(', ') + 
          (latestOrder.items.length > 2 ? ` (+${latestOrder.items.length - 2} more)` : '');
        const rider = latestOrder.riderDeliveries?.[0]?.rider?.user;
        const isQuick = latestOrder.fulfillmentType === 'quick_commerce';
        const rawStatus = latestOrder.status.replace(/_/g, ' ').toUpperCase();

        let etaText = isQuick 
          ? '⚡ Hyperlocal Delivery: 10–20 minute express transit.' 
          : '🚚 Standard Delivery: Pan-India courier transit.';

        if (rider) {
          etaText += ` Assigned Delivery Partner: ${rider.name}${rider.phone ? ` (${rider.phone})` : ''}.`;
        }

        answer = `📦 Latest Order Details (#${latestOrder.orderNumber || latestOrder.id.slice(-6)}):\n` +
          `• Item(s): ${itemNames}\n` +
          `• Status: ${rawStatus}\n` +
          `• Total Amount: ₹${latestOrder.totalAmount?.toLocaleString('en-IN')}\n` +
          `• ${etaText}\n\n` +
          `You can view full real-time route tracking anytime in your Orders tab!`;
      } else {
        answer = '📦 Order Tracking:\nYou currently have no active deliveries in transit. If you recently placed an order, please allow a couple minutes for order processing, or verify in your Orders tab.';
      }
    } 
    // 2. REFUND & RETURN QUERIES
    else if (
      lowerQuery.includes('refund') || 
      lowerQuery.includes('money back') || 
      lowerQuery.includes('return')
    ) {
      let refundOrder = null;
      if (customerId) {
        refundOrder = await prisma.order.findFirst({
          where: { 
            customerId, 
            OR: [{ paymentStatus: 'refunded' }, { status: 'cancelled' }] 
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      if (refundOrder) {
        answer = `💳 Refund Details for Order #${refundOrder.orderNumber || refundOrder.id.slice(-6)}:\n` +
          `• Amount: ₹${refundOrder.totalAmount?.toLocaleString('en-IN')}\n` +
          `• Status: Refund processed back to your original source.\n` +
          `• Timeline: Instant for UPI/Wallets (2-4 hours), 2-5 business days for Cards & NetBanking.`;
      } else {
        answer = `💳 ShopIndia Refund Policy:\n` +
          `• Order Cancellations: Processed immediately back to original payment mode.\n` +
          `• Returns: Delivered items can be returned within 7 days from the Orders tab.\n` +
          `• For instant refund review, please click "Talk to specialist" below.`;
      }
    }
    // 3. SERVICE RESCHEDULING & GLACONS BOOKINGS
    else if (
      lowerQuery.includes('reschedule') || 
      lowerQuery.includes('service') || 
      lowerQuery.includes('technician') ||
      lowerQuery.includes('slot')
    ) {
      answer = `🔧 Glacons Service Bookings:\n` +
        `• Rescheduling: You can change technician appointment dates/slots free of charge up to 2 hours before the visit.\n` +
        `• 30-Day Warranty: All repairs include free technician revisits if any problem persists.\n` +
        `• Verified Experts: All technicians are background-checked and carry genuine parts.`;
    }
    // 4. TALK TO SPECIALIST / HUMAN ESCALATION
    else if (
      lowerQuery.includes('specialist') ||
      lowerQuery.includes('agent') ||
      lowerQuery.includes('human') ||
      lowerQuery.includes('executive') ||
      lowerQuery.includes('talk to') ||
      lowerQuery.includes('support team')
    ) {
      isEscalated = true;
      if (liveTicket) {
        await prisma.ticket.update({
          where: { id: liveTicket.id },
          data: {
            priority: 'urgent',
            status: 'in_progress',
            subject: `[LIVE CHAT - WAITING FOR AGENT] Support Session #${liveTicket.ticketNumber}`
          }
        });
      }

      answer = `🔔 You are now connected with our Live Support Desk (Session #${liveTicket?.ticketNumber || 'LIVE'}).\n\n` +
        `A support specialist has been notified and will reply right here in this chat window. Please type your message or order details below so we can resolve it immediately!`;
    }
    // 5. GREETINGS & FAQ MATCHES
    else if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      answer = 'Hello! 👋 Welcome to ShopIndia Live Support. How can we help you today? You can select any quick option below (Track delivery, Refund status, Service reschedule) or type your question directly.';
    } else if (lowerQuery.includes('thank')) {
      answer = 'You are welcome! 😊 Let me know if you need any other assistance, or click "Talk to specialist" if you have any questions.';
    } else {
      // Find best match in dynamic stored FAQs
      const allFaqs = await getStoredSupportFaqs();
      const matchedFaq = allFaqs.find(faq => {
        const qLower = (faq.question || '').toLowerCase();
        return lowerQuery.includes(qLower) || qLower.includes(lowerQuery) ||
          (faq.id && lowerQuery.includes(faq.id.toLowerCase())) ||
          (faq.keywords && Array.isArray(faq.keywords) && faq.keywords.some(k => lowerQuery.includes(k.toLowerCase())));
      });

      if (matchedFaq) {
        answer = matchedFaq.answer;
        if (matchedFaq.canRaiseTicket) {
          answer += `\n\n📌 Need further assistance? You can submit an official complaint on the left panel. Our superiors will resolve it within 2 to 4 business working days.`;
        }
      } else {
        answer = `Thank you for reaching out! For any specific issues with orders, deliveries, or payments, please choose one of the common questions below or raise a ticket using the form on the left. Our superiors and support desk resolve tickets within 2 to 4 business working days.`;
      }
    }

    // Save bot response to database so history is preserved
    if (liveTicket) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: liveTicket.id,
          senderRole: 'bot',
          text: answer
        }
      });
    }

    res.json({
      query,
      answer,
      sessionId: liveTicket?.id,
      sessionNumber: liveTicket?.ticketNumber,
      isEscalated,
      suggestTicket: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/support/ticket & /api/support/tickets - Create support ticket
 */
router.post(['/ticket', '/tickets'], async (req, res) => {
  try {
    const { subject, category = 'other', priority = 'medium', message, name, email, phone } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }

    let customerId = getOptionalUserId(req);

    if (customerId) {
      const existingUser = await prisma.user.findUnique({ where: { id: customerId } });
      if (!existingUser) customerId = null;
    }

    // If no user token or user not in DB, find or create guest user
    if (!customerId) {
      const guestEmail = email || `guest-${Date.now()}@shopindia.in`;
      let user = await prisma.user.findFirst({
        where: { email: guestEmail }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: name || 'Customer',
            email: guestEmail,
            phone: phone || null,
            password: 'guest-no-login-' + Math.random(),
            role: 'customer'
          }
        });
      }
      customerId = user.id;
    }

    // Map category to Prisma enum
    const validCategories = ['order_issue', 'payment', 'refund', 'product', 'delivery', 'other'];
    const formattedCategory = validCategories.includes(category.toLowerCase()) ? category.toLowerCase() : 'other';

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const formattedPriority = validPriorities.includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium';

    // Compute SLA Deadline based on priority:
    // urgent: 15 min, high: 1 hr, medium: 4 hrs, low: 24 hrs
    const now = new Date();
    let slaMinutes = 240;
    if (formattedPriority === 'urgent') slaMinutes = 15;
    else if (formattedPriority === 'high') slaMinutes = 60;
    else if (formattedPriority === 'low') slaMinutes = 1440;
    const slaDeadline = new Date(now.getTime() + slaMinutes * 60 * 1000);

    // Auto-resolve vendorId and regionalAdmin from orderId if provided
    let resolvedVendorId = req.body.vendorId || null;
    let resolvedRegionId = null;
    let initialTier = 1;
    let orderRecord = null;

    if (req.body.orderId) {
      orderRecord = await prisma.order.findUnique({
        where: { id: req.body.orderId },
        include: { vendor: true }
      });
      if (orderRecord) {
        if (!resolvedVendorId && orderRecord.vendorId) {
          resolvedVendorId = orderRecord.vendorId;
        }

        // 1. Direct delivery pincode match
        if (orderRecord.deliveryPincode) {
          const regAdmin = await prisma.regionalAdminProfile.findFirst({
            where: { assignedPincodes: { has: orderRecord.deliveryPincode }, status: 'approved' }
          });
          if (regAdmin) resolvedRegionId = regAdmin.id;
        }

        // 2. Fallback: vendor pincode match
        if (!resolvedRegionId && orderRecord.vendor?.pincode) {
          const regAdmin = await prisma.regionalAdminProfile.findFirst({
            where: { assignedPincodes: { has: orderRecord.vendor.pincode }, status: 'approved' }
          });
          if (regAdmin) resolvedRegionId = regAdmin.id;
        }

        // 3. Fallback: GPS radius distance match (within 25 km)
        if (!resolvedRegionId) {
          const targetLat = orderRecord.deliveryLat || orderRecord.vendor?.lat;
          const targetLng = orderRecord.deliveryLng || orderRecord.vendor?.lng;
          if (targetLat && targetLng) {
            const approvedAdmins = await prisma.regionalAdminProfile.findMany({
              where: { status: 'approved', currentLat: { not: null }, currentLng: { not: null } }
            });
            for (const adm of approvedAdmins) {
              if (getHaversineDistanceKm(targetLat, targetLng, adm.currentLat, adm.currentLng) <= 25) {
                resolvedRegionId = adm.id;
                break;
              }
            }
          }
        }
      }
    }

    // If still no region, check vendor directly if provided
    if (!resolvedRegionId && resolvedVendorId) {
      const v = await prisma.vendor.findUnique({ where: { id: resolvedVendorId } });
      if (v?.pincode) {
        const regAdmin = await prisma.regionalAdminProfile.findFirst({
          where: { assignedPincodes: { has: v.pincode }, status: 'approved' }
        });
        if (regAdmin) resolvedRegionId = regAdmin.id;
      }
      if (!resolvedRegionId && v?.lat && v?.lng) {
        const approvedAdmins = await prisma.regionalAdminProfile.findMany({
          where: { status: 'approved', currentLat: { not: null }, currentLng: { not: null } }
        });
        for (const adm of approvedAdmins) {
          if (getHaversineDistanceKm(v.lat, v.lng, adm.currentLat, adm.currentLng) <= 25) {
            resolvedRegionId = adm.id;
            break;
          }
        }
      }
    }

    // Determine initial handling tier:
    // Tier 1: Vendor (if product/vendor order issue)
    // Tier 2: Regional Admin (if delivery/fleet issue or regional manager assigned)
    // Tier 3: Super Admin (if payment issue or no regional manager)
    if (formattedCategory === 'payment') {
      initialTier = 3;
    } else if (formattedCategory === 'delivery' && resolvedRegionId) {
      initialTier = 2;
    } else if (resolvedVendorId) {
      initialTier = 1;
    } else if (resolvedRegionId) {
      initialTier = 2;
    } else {
      initialTier = 3;
    }

    const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const isOrderAlreadyRefunded = orderRecord?.status === 'refunded' || orderRecord?.paymentStatus === 'refunded';
    const isRefundReq = req.body.refundRequested === true || formattedCategory === 'refund' || isOrderAlreadyRefunded;
    const finalRefundStatus = isOrderAlreadyRefunded ? 'approved' : isRefundReq ? 'pending' : 'none';
    const finalRefundAmt = isOrderAlreadyRefunded ? (orderRecord.refundAmount || orderRecord.total) : (req.body.refundAmount ? parseFloat(req.body.refundAmount) : null);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        customerId,
        orderId: req.body.orderId || null,
        vendorId: resolvedVendorId,
        regionId: resolvedRegionId,
        tier: initialTier,
        slaDeadline,
        subject,
        category: formattedCategory,
        priority: formattedPriority,
        status: 'open',
        refundRequested: isRefundReq,
        refundAmount: finalRefundAmt,
        refundStatus: finalRefundStatus,
        messages: {
          create: [
            {
              senderRole: 'customer',
              text: message,
              sentAt: new Date()
            }
          ]
        }
      },
      include: {
        messages: true,
        order: {
          select: { id: true, orderNumber: true, total: true, status: true }
        }
      }
    });

    // In-App Alert Notification for Customer
    if (customerId) {
      await prisma.userNotification.create({
        data: {
          userId: customerId,
          category: 'order',
          title: `Support Ticket #${ticket.ticketNumber} Raised 🎫`,
          message: `Your ticket regarding "${ticket.subject}" has been received. Our resolution team will update you shortly.`,
          channel: 'IN_APP',
          isRead: false,
          link: '/dashboard?tab=support'
        }
      }).catch(err => console.error('Failed to create ticket userNotification:', err));
    }

    res.status(201).json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        order: ticket.order
      },
      message: 'Support ticket successfully raised. A service specialist will contact you shortly.'
    });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/support/tickets & /api/support/ticket - Get customer tickets
 * Security: Requires one of: (a) valid JWT token, (b) email param, (c) ticketNumber param.
 * Without any identifier, returns empty array (no public data leakage).
 */
router.get(['/tickets', '/ticket'], async (req, res) => {
  try {
    const customerId = getVerifiedUserId(req);
    const { email, ticketNumber } = req.query;

    let where = {};
    if (ticketNumber) {
      // Lookup by ticket number — allowed for guest tracking (no auth needed)
      where.ticketNumber = String(ticketNumber).trim();
    } else if (customerId) {
      where.customerId = customerId;
    } else if (email) {
      const user = await prisma.user.findFirst({ where: { email: String(email) } });
      if (user) where.customerId = user.id;
      else return res.json({ tickets: [] });
    } else {
      // No identifier provided — return empty list (security fix: was exposing latest 10 tickets publicly)
      return res.json({ tickets: [] });
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        messages: true,
        order: {
          select: { id: true, orderNumber: true, total: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/support/tickets/:id - Get single ticket with full message history
 * Security: Requires caller to be the ticket owner (via JWT) OR provide matching ticketNumber+email.
 */
router.get('/tickets/:id', async (req, res) => {
  try {
    const callerId = getVerifiedUserId(req);
    const { email } = req.query;

    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { id: req.params.id },
          { ticketNumber: req.params.id }
        ]
      },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' }
        },
        customer: {
          select: { name: true, email: true, phone: true }
        },
        order: {
          select: { id: true, orderNumber: true, total: true, status: true }
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Ownership check: must be the ticket owner OR provide the correct account email
    const isOwner = callerId && callerId === ticket.customerId;
    const emailMatch = email && ticket.customer?.email === String(email).toLowerCase().trim();

    if (!isOwner && !emailMatch) {
      return res.status(403).json({ error: 'Access denied. Please provide valid authentication or your registered email.' });
    }

    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/support/tickets/:id/reply & /api/support/ticket/:id/reply - Customer reply to a ticket
 * Security: Requires valid JWT matching the ticket's customerId.
 */
router.post(['/tickets/:id/reply', '/ticket/:id/reply'], async (req, res) => {
  try {
    const callerId = getVerifiedUserId(req);
    if (!callerId) {
      return res.status(401).json({ error: 'Authentication required to reply to a ticket.' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Reply text is required.' });
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { id: req.params.id },
          { ticketNumber: req.params.id }
        ]
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Ownership check: only the ticket owner can reply via this customer endpoint
    if (ticket.customerId !== callerId) {
      return res.status(403).json({ error: 'Access denied. You can only reply to your own tickets.' });
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: 'customer',
        text: text.trim(),
        sentAt: new Date()
      }
    });

    // If ticket was resolved, re-open it when customer replies
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: ticket.status === 'resolved' ? 'open' : ticket.status },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' }
        }
      }
    });

    res.json({
      success: true,
      message,
      ticket: updatedTicket
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
