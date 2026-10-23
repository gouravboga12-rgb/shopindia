'use strict';
/**
 * server/routes/payments.js
 * Razorpay payment flow endpoints.
 *
 * POST /api/payments/create-order  — Create Razorpay order & PaymentRecord
 * POST /api/payments/verify        — Verify signature & mark payment captured
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { verifyToken } = require('../middleware/auth');
const { createOrder, verifyPaymentSignature } = require('../lib/razorpay');

const router = express.Router();

/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for a given internal order ID.
 * Customer must be authenticated.
 */
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required.' });

    // Find internal order — must belong to this customer
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: req.user.userId },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!order.total || order.total <= 0) {
      return res.status(400).json({ error: 'Order total is invalid.' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(409).json({ error: 'Order is already paid.' });
    }

    // Create or fetch existing PaymentRecord
    let paymentRecord = await prisma.paymentRecord.findUnique({ where: { orderId } });

    const amountPaise = Math.round(order.total * 100);

    // Create Razorpay order
    const rzpOrder = await createOrder(amountPaise, order.orderNumber, {
      shopindia_order_id: order.id,
      customer_id: req.user.userId,
    });

    // Upsert PaymentRecord
    if (paymentRecord) {
      paymentRecord = await prisma.paymentRecord.update({
        where: { orderId },
        data: {
          razorpayOrderId: rzpOrder.id,
          amount: order.total,
          status: 'initiated',
        },
      });
    } else {
      paymentRecord = await prisma.paymentRecord.create({
        data: {
          orderId,
          razorpayOrderId: rzpOrder.id,
          amount: order.total,
          currency: 'INR',
          status: 'initiated',
        },
      });
    }

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,       // in paise
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    console.error('Create payment order error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/verify
 * Verify Razorpay payment signature after customer completes payment.
 * Updates PaymentRecord to 'captured' and Order.paymentStatus to 'paid'.
 */
router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required.' });
    }

    // Verify HMAC signature
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature. Payment verification failed.' });
    }

    // Update PaymentRecord
    await prisma.paymentRecord.update({
      where: { razorpayOrderId },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'captured',
        capturedAt: new Date(),
      },
    });

    // Update Order payment status
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'paid', paymentRef: razorpayPaymentId },
      });
    }

    res.json({ success: true, message: 'Payment verified successfully.' });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

