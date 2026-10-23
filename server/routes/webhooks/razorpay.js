'use strict';
/**
 * server/routes/webhooks/razorpay.js
 * Handles incoming Razorpay webhook events.
 *
 * IMPORTANT: This route must receive the RAW request body (Buffer) for HMAC verification.
 * In index.js, mount BEFORE any json() middleware or use express.raw() on this route.
 *
 * Handled events:
 *  - payment.captured   → update PaymentRecord, write GATEWAY_FEE + GATEWAY_TAX ledger entries
 *  - refund.processed   → update PaymentRecord refundedAmount, update order status
 *  - settlement.processed → create GatewaySettlement record
 */

const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyWebhookSignature } = require('../../lib/razorpay');
const { postLedgerEntries } = require('../../lib/ledger');

const router = express.Router();

// Must receive raw Buffer body — mount with express.raw({ type: 'application/json' })
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const receivedSig = req.headers['x-razorpay-signature'];

  // Always respond 200 quickly to Razorpay to prevent retries
  res.status(200).json({ received: true });

  // Verify signature
  if (!webhookSecret || !receivedSig) {
    console.warn('[Razorpay Webhook] Missing secret or signature — ignoring event.');
    return;
  }

  const isValid = verifyWebhookSignature(req.body, webhookSecret, receivedSig);
  if (!isValid) {
    console.error('[Razorpay Webhook] Invalid signature — rejecting event.');
    return;
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch (e) {
    console.error('[Razorpay Webhook] Failed to parse payload:', e.message);
    return;
  }

  const event = payload.event;
  console.log(`[Razorpay Webhook] Received event: ${event}`);

  try {
    if (event === 'payment.captured') {
      await handlePaymentCaptured(payload);
    } else if (event === 'refund.processed') {
      await handleRefundProcessed(payload);
    } else if (event === 'settlement.processed') {
      await handleSettlementProcessed(payload);
    }
  } catch (err) {
    console.error(`[Razorpay Webhook] Error processing event ${event}:`, err.message);
  }
});

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function handlePaymentCaptured(payload) {
  const payment = payload.payload?.payment?.entity;
  if (!payment) return;

  const razorpayPaymentId = payment.id;
  const razorpayOrderId = payment.order_id;

  // fee and tax from Razorpay are in paise — convert to INR
  const gatewayFeeINR = parseFloat(((payment.fee || 0) / 100).toFixed(2));
  const gatewayTaxINR = parseFloat(((payment.tax || 0) / 100).toFixed(2));
  const amountINR = parseFloat(((payment.amount || 0) / 100).toFixed(2));
  const netReceivedINR = parseFloat((amountINR - gatewayFeeINR - gatewayTaxINR).toFixed(2));

  // Find PaymentRecord by razorpayOrderId
  const paymentRecord = await prisma.paymentRecord.findUnique({
    where: { razorpayOrderId },
  });

  if (!paymentRecord) {
    console.warn(`[Webhook] No PaymentRecord found for Razorpay order: ${razorpayOrderId}`);
    return;
  }

  // Update PaymentRecord with actual fee/tax from Razorpay
  await prisma.paymentRecord.update({
    where: { razorpayOrderId },
    data: {
      razorpayPaymentId,
      status: 'captured',
      gatewayFee: gatewayFeeINR,
      gatewayTax: gatewayTaxINR,
      netReceived: netReceivedINR,
      capturedAt: new Date(),
      webhookPayload: payload,
    },
  });

  // Write gateway fee ledger entries if there was a fee
  if (gatewayFeeINR > 0 || gatewayTaxINR > 0) {
    const entries = [];
    if (gatewayFeeINR > 0) {
      entries.push({
        type: 'DEBIT',
        party: 'GATEWAY',
        partyId: 'razorpay',
        amount: gatewayFeeINR,
        entryType: 'GATEWAY_FEE',
        orderId: paymentRecord.orderId,
        description: `Razorpay fee on payment ${razorpayPaymentId}`,
        metadata: { razorpayPaymentId, razorpayOrderId, rawFeeInPaise: payment.fee },
      });
    }
    if (gatewayTaxINR > 0) {
      entries.push({
        type: 'DEBIT',
        party: 'GATEWAY',
        partyId: 'razorpay',
        amount: gatewayTaxINR,
        entryType: 'GATEWAY_TAX',
        orderId: paymentRecord.orderId,
        description: `GST on Razorpay fee for payment ${razorpayPaymentId}`,
        metadata: { razorpayPaymentId, rawTaxInPaise: payment.tax },
      });
    }

    // Write outside a transaction since we're in an async webhook handler
    await postLedgerEntries(prisma, entries);
  }

  console.log(`[Webhook] payment.captured: order=${paymentRecord.orderId}, fee=₹${gatewayFeeINR}, tax=₹${gatewayTaxINR}`);
}

async function handleRefundProcessed(payload) {
  const refund = payload.payload?.refund?.entity;
  if (!refund) return;

  const razorpayPaymentId = refund.payment_id;
  const refundAmountINR = parseFloat(((refund.amount || 0) / 100).toFixed(2));

  // Find PaymentRecord
  const paymentRecord = await prisma.paymentRecord.findUnique({
    where: { razorpayPaymentId },
  });

  if (!paymentRecord) {
    console.warn(`[Webhook] No PaymentRecord found for payment: ${razorpayPaymentId}`);
    return;
  }

  // Update PaymentRecord refunded amount
  await prisma.paymentRecord.update({
    where: { razorpayPaymentId },
    data: {
      refundedAmount: { increment: refundAmountINR },
      status: 'refunded',
    },
  });

  // Update order status to refunded
  await prisma.order.update({
    where: { id: paymentRecord.orderId },
    data: { paymentStatus: 'refunded', refundAmount: refundAmountINR, refundedAt: new Date() },
  }).catch(() => {});

  console.log(`[Webhook] refund.processed: payment=${razorpayPaymentId}, amount=₹${refundAmountINR}`);
}

async function handleSettlementProcessed(payload) {
  const settlement = payload.payload?.settlement?.entity;
  if (!settlement) return;

  const existingSettlement = await prisma.gatewaySettlement.findUnique({
    where: { razorpaySettlementId: settlement.id },
  });

  if (existingSettlement) {
    console.log(`[Webhook] Settlement ${settlement.id} already recorded.`);
    return;
  }

  await prisma.gatewaySettlement.create({
    data: {
      razorpaySettlementId: settlement.id,
      amount: parseFloat(((settlement.amount || 0) / 100).toFixed(2)),
      fee: parseFloat(((settlement.fees || 0) / 100).toFixed(2)),
      tax: parseFloat(((settlement.tax || 0) / 100).toFixed(2)),
      settledAt: settlement.settled_at ? new Date(settlement.settled_at * 1000) : null,
      rawPayload: payload,
    },
  });

  console.log(`[Webhook] settlement.processed: id=${settlement.id}`);
}

module.exports = router;

