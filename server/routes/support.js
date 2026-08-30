const express = require('express');
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Helper to optionally extract authenticated user ID
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

// FAQ Knowledgebase for Smart Assistance
const SERVICE_FAQS = [
  {
    id: 'book-service',
    keywords: ['book', 'booking', 'service', 'ac', 'repair', 'schedule', 'hire', 'technician'],
    question: 'How do I book an AC, Plumbing, or Electrical service?',
    answer: 'You can select any service package from our Services catalog, choose your preferred date and time slot, and click "Book Service Now". A certified expert technician will be assigned to your doorstep.'
  },
  {
    id: 'reschedule',
    keywords: ['reschedule', 'change time', 'slot', 'delay', 'cancel slot'],
    question: 'Can I reschedule or change my booked service slot?',
    answer: 'Yes! You can reschedule your booking free of charge up to 2 hours before the scheduled time by visiting "My Orders / Bookings" or by requesting our support team.'
  },
  {
    id: 'pricing',
    keywords: ['price', 'pricing', 'charges', 'cost', 'estimate', 'rate', 'inspection fee'],
    question: 'What are the inspection and service charges?',
    answer: 'We provide transparent upfront pricing on all packages with no hidden costs. A standard inspection fee of ₹199 applies only if you decide not to proceed with the recommended repair.'
  },
  {
    id: 'warranty',
    keywords: ['warranty', 'guarantee', 'revisit', 'issue after repair', 'cover'],
    question: 'Is there a warranty on service repairs?',
    answer: 'Yes! All services booked through ShopIndia come with a 30-day service warranty. If you face any issues after the repair, we provide a free technician revisit.'
  },
  {
    id: 'safety-checks',
    keywords: ['safety', 'verified', 'background', 'police verification', 'expert'],
    question: 'Are service professionals verified and background checked?',
    answer: 'Every technician on ShopIndia is certified, background-verified, and follows strict safety protocols with genuine parts and standardized pricing.'
  }
];

/**
 * GET /api/support/faqs - Retrieve default questions and answers
 */
router.get('/faqs', (_req, res) => {
  res.json({ faqs: SERVICE_FAQS });
});

/**
 * POST /api/support/chat - Interactive AI / Auto-help query
 */
router.post('/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const lowerQuery = query.toLowerCase().trim();
    
    // Find best match in FAQs
    let matchedFaq = SERVICE_FAQS.find(faq => 
      faq.keywords.some(k => lowerQuery.includes(k)) ||
      lowerQuery.includes(faq.question.toLowerCase())
    );

    let answer = '';
    if (matchedFaq) {
      answer = matchedFaq.answer;
    } else if (lowerQuery.includes('hello') || lowerQuery.includes('hi') || lowerQuery.includes('hey')) {
      answer = 'Hello! 👋 How can I help you with your home services, bookings, or technician requests today? You can select any quick question below or ask me directly.';
    } else if (lowerQuery.includes('thank')) {
      answer = 'You are welcome! 😊 Let me know if you need anything else, or feel free to raise a support ticket anytime.';
    } else {
      answer = `Thank you for asking about "${query}". To get dedicated assistance for this specific request, please click "Raise a Support Ticket" below and our specialist will reach out immediately.`;
    }

    res.json({
      query,
      answer,
      suggestTicket: !matchedFaq,
      suggestedQuestions: SERVICE_FAQS.slice(0, 3).map(f => f.question)
    });
  } catch (err) {
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

    const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        customerId,
        subject,
        category: formattedCategory,
        priority: formattedPriority,
        status: 'open',
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
        messages: true
      }
    });

    res.status(201).json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt
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
 */
router.get(['/tickets', '/ticket'], async (req, res) => {
  try {
    const customerId = getOptionalUserId(req);
    const { email, ticketNumber } = req.query;

    let where = {};
    if (ticketNumber) {
      where.ticketNumber = String(ticketNumber).trim();
    } else if (customerId) {
      where.customerId = customerId;
    } else if (email) {
      const user = await prisma.user.findFirst({ where: { email: String(email) } });
      if (user) where.customerId = user.id;
      else return res.json({ tickets: [] });
    } else {
      // Return latest public/guest tickets for easy tracking if no auth
      const tickets = await prisma.ticket.findMany({
        include: { messages: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      return res.json({ tickets });
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        messages: true
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
 */
router.get('/tickets/:id', async (req, res) => {
  try {
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
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/support/tickets/:id/reply & /api/support/ticket/:id/reply - Customer reply to a ticket
 */
router.post(['/tickets/:id/reply', '/ticket/:id/reply'], async (req, res) => {
  try {
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

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderRole: 'customer',
        text: text.trim(),
        sentAt: new Date()
      }
    });

    // If ticket was closed/resolved, re-open to in_progress
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
