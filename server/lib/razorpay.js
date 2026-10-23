'use strict';
/**
 * server/lib/razorpay.js
 * Razorpay SDK wrapper for ShopIndia.
 * Exposes createOrder, verifyPaymentSignature, createRefund, fetchPaymentDetails.
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Lazy initialize Razorpay instance — avoids crash at require() when env vars are not set
let _rzp = null;
function getRzp() {
  if (!_rzp) {
    _rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _rzp;
}

/**
 * Create a Razorpay order.
 * @param {number} amountInPaise - Amount in paise (multiply INR by 100)
 * @param {string} receipt      - Unique receipt string (order ID / UUID)
 * @param {Object} [notes]      - Optional key-value notes
 */
async function createOrder(amountInPaise, receipt, notes = {}) {
  return getRzp().orders.create({
    amount: Math.round(amountInPaise),
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes,
  });
}

/**
 * Verify Razorpay payment signature (HMAC SHA-256).
 * @param {string} razorpayOrderId
 * @param {string} razorpayPaymentId
 * @param {string} razorpaySignature
 * @returns {boolean}
 */
function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === razorpaySignature;
}

/**
 * Verify incoming webhook signature.
 * @param {string|Buffer} rawBody  - Raw request body (must be unparsed Buffer)
 * @param {string} webhookSecret   - RAZORPAY_WEBHOOK_SECRET env variable
 * @param {string} receivedSig     - Value of X-Razorpay-Signature header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, webhookSecret, receivedSig) {
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === receivedSig;
}

/**
 * Fetch full payment details from Razorpay (includes fee & tax).
 * @param {string} paymentId - Razorpay payment ID (pay_xxx)
 */
async function fetchPaymentDetails(paymentId) {
  return getRzp().payments.fetch(paymentId);
}

/**
 * Initiate a refund for a payment.
 * @param {string} paymentId  - Razorpay payment ID
 * @param {number} amountPaise - Amount to refund in paise (or omit for full refund)
 * @param {Object} [notes]
 */
async function createRefund(paymentId, amountPaise, notes = {}) {
  const payload = { notes };
  if (amountPaise) payload.amount = Math.round(amountPaise);
  return getRzp().payments.refund(paymentId, payload);
}

module.exports = {
  getRzp,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
  createRefund,
};

