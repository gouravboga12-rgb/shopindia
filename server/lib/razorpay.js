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
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_TrcIdNBK1BkfF0',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'Qo9u5rOfjFo6ov36FQCe2P8i',
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
 * Flexible Razorpay order creator supporting both signature types:
 * 1. createRazorpayOrder({ amount, currency, receipt, notes }) - amount in INR rupees
 * 2. createRazorpayOrder(amountInPaise, receipt, notes) - amount in paise
 */
async function createRazorpayOrder(arg1, arg2, arg3) {
  if (typeof arg1 === 'object' && arg1 !== null) {
    const { amount, currency = 'INR', receipt, notes = {} } = arg1;
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    return getRzp().orders.create({
      amount: amountInPaise,
      currency,
      receipt: String(receipt || `rec_${Date.now()}`).slice(0, 40),
      notes,
    });
  }
  return createOrder(arg1, arg2, arg3);
}

/**
 * Verify Razorpay payment signature (HMAC SHA-256).
 * Accepts either 3 positional parameters or a single options object.
 * @param {string|object} arg1 - razorpayOrderId OR { orderId, paymentId, signature }
 * @param {string} [arg2] - razorpayPaymentId
 * @param {string} [arg3] - razorpaySignature
 * @returns {boolean}
 */
function verifyPaymentSignature(arg1, arg2, arg3) {
  let orderId = arg1;
  let paymentId = arg2;
  let signature = arg3;

  if (typeof arg1 === 'object' && arg1 !== null) {
    orderId = arg1.orderId || arg1.razorpayOrderId || arg1.razorpay_order_id;
    paymentId = arg1.paymentId || arg1.razorpayPaymentId || arg1.razorpay_payment_id;
    signature = arg1.signature || arg1.razorpaySignature || arg1.razorpay_signature;
  }

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET || 'Qo9u5rOfjFo6ov36FQCe2P8i';
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
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
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
  createRefund,
};

