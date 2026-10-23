'use strict';
/**
 * server/lib/ledger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Immutable double-entry ledger engine for ShopIndia.
 *
 * RULES:
 *  1. Every money movement is recorded as one or more LedgerEntry rows.
 *  2. Entries are NEVER updated or deleted — only appended.
 *  3. All writes MUST happen inside the same Prisma transaction as the
 *     wallet balance update so the ledger is always consistent.
 *
 * ENTRY TYPES (entryType field):
 *  VENDOR_CREDIT      – vendor wallet credit on order delivery
 *  RIDER_CREDIT       – rider wallet credit on delivery completion
 *  PLATFORM_FEE       – platform commission deducted from order
 *  GATEWAY_FEE        – Razorpay transaction fee (2% base)
 *  GATEWAY_TAX        – GST on Razorpay fee (18% on fee)
 *  REFUND             – customer refund; debits the at-fault party
 *  PAYOUT             – wallet to bank payout (debit from wallet)
 *  OPENING_BALANCE    – initial balance migration entry
 *  COD_COLLECTION     – rider collected cash on delivery
 *  COD_REMITTANCE     – rider remitted collected cash
 */

const prisma = require('./prisma');

// ─── Constants ────────────────────────────────────────────────────────────────

// Razorpay effective fee: 2% base + 18% GST on fee = 2% * 1.18 = 2.36%
const RAZORPAY_EFFECTIVE_RATE = 0.0236;
const RAZORPAY_BASE_RATE = 0.02;
const RAZORPAY_GST_RATE = 0.18; // applied on the base fee only

/**
 * Calculate exact Razorpay gateway fee breakdown for a given INR amount.
 * @param {number} amount - INR amount charged to customer
 * @returns {{ fee: number, tax: number, total: number, netReceived: number }}
 */
function calcGatewayFee(amount) {
  const fee = parseFloat((amount * RAZORPAY_BASE_RATE).toFixed(2));
  const tax = parseFloat((fee * RAZORPAY_GST_RATE).toFixed(2));
  const total = parseFloat((fee + tax).toFixed(2));
  const netReceived = parseFloat((amount - total).toFixed(2));
  return { fee, tax, total, netReceived };
}

// ─── Core Ledger Writer ───────────────────────────────────────────────────────

/**
 * Post one or more ledger entries inside an existing Prisma transaction.
 * Always call this WITHIN a prisma.$transaction() callback.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx - Prisma TX client
 * @param {Array} entries - Array of entry objects to create
 * @returns {Promise<Array>} Created LedgerEntry records
 */
async function postLedgerEntries(tx, entries) {
  if (!entries || entries.length === 0) return [];

  const results = await Promise.all(
    entries.map((entry) =>
      tx.ledgerEntry.create({
        data: {
          type: entry.type,
          party: entry.party,
          partyId: entry.partyId,
          amount: parseFloat(entry.amount.toFixed(2)),
          entryType: entry.entryType,
          orderId: entry.orderId || null,
          description: entry.description || null,
          metadata: entry.metadata || null,
          vendorId: entry.vendorId || null,
          riderProfileId: entry.riderProfileId || null,
        },
      })
    )
  );

  return results;
}

// ─── High-Level Helpers ───────────────────────────────────────────────────────

/**
 * Record vendor earnings on order delivery.
 * Call INSIDE a prisma.$transaction() alongside the wallet increment.
 *
 * @param {Object} tx - Prisma TX client
 * @param {Object} opts
 * @param {string} opts.orderId
 * @param {string} opts.vendorId
 * @param {number} opts.vendorAmount  - Net amount credited to vendor
 * @param {number} opts.commission    - Platform commission amount
 * @param {number} opts.orderTotal    - Total customer paid
 * @param {boolean} [opts.includeGateway] - If true, also post gateway fee entries
 */
async function recordVendorCredit(tx, opts) {
  const { orderId, vendorId, vendorAmount, commission, orderTotal, includeGateway = false } = opts;

  const entries = [
    {
      type: 'CREDIT',
      party: 'VENDOR',
      partyId: vendorId,
      vendorId,
      amount: vendorAmount,
      entryType: 'VENDOR_CREDIT',
      orderId,
      description: `Vendor payout for order #${orderId}`,
      metadata: { orderTotal, commission },
    },
    {
      type: 'DEBIT',
      party: 'PLATFORM',
      partyId: 'platform',
      amount: commission,
      entryType: 'PLATFORM_FEE',
      orderId,
      description: `Platform commission on order #${orderId}`,
      metadata: { orderTotal, vendorId },
    },
  ];

  if (includeGateway) {
    const { fee, tax } = calcGatewayFee(orderTotal);
    entries.push(
      {
        type: 'DEBIT',
        party: 'GATEWAY',
        partyId: 'razorpay',
        amount: fee,
        entryType: 'GATEWAY_FEE',
        orderId,
        description: `Razorpay transaction fee on order #${orderId}`,
        metadata: { rate: RAZORPAY_BASE_RATE, orderTotal },
      },
      {
        type: 'DEBIT',
        party: 'GATEWAY',
        partyId: 'razorpay',
        amount: tax,
        entryType: 'GATEWAY_TAX',
        orderId,
        description: `GST on Razorpay fee for order #${orderId}`,
        metadata: { gstRate: RAZORPAY_GST_RATE, fee },
      }
    );
  }

  return postLedgerEntries(tx, entries);
}

/**
 * Record rider delivery fee credit on order completion.
 * Call INSIDE a prisma.$transaction() alongside the wallet increment.
 */
async function recordRiderCredit(tx, opts) {
  const { orderId, riderProfileId, deliveryFee } = opts;

  return postLedgerEntries(tx, [
    {
      type: 'CREDIT',
      party: 'RIDER',
      partyId: riderProfileId,
      riderProfileId,
      amount: deliveryFee,
      entryType: 'RIDER_CREDIT',
      orderId,
      description: `Delivery fee for order #${orderId}`,
      metadata: { deliveryFee },
    },
  ]);
}

/**
 * Record a payout debit (wallet → bank) when admin processes a payout.
 */
async function recordPayout(tx, opts) {
  const { party, partyId, amount, vendorId, riderProfileId, payoutRequestId } = opts;

  return postLedgerEntries(tx, [
    {
      type: 'DEBIT',
      party,
      partyId,
      amount,
      entryType: 'PAYOUT',
      description: `Payout processed${payoutRequestId ? ` (request: ${payoutRequestId})` : ''}`,
      metadata: { payoutRequestId },
      vendorId: vendorId || null,
      riderProfileId: riderProfileId || null,
    },
  ]);
}

/**
 * Record a refund debit against the at-fault party.
 */
async function recordRefund(tx, opts) {
  const { orderId, atFaultParty, atFaultPartyId, refundAmount, reason } = opts;

  return postLedgerEntries(tx, [
    {
      type: 'DEBIT',
      party: atFaultParty,
      partyId: atFaultPartyId,
      amount: refundAmount,
      entryType: 'REFUND',
      orderId,
      description: `Refund for order #${orderId}${reason ? `: ${reason}` : ''}`,
      metadata: { reason, atFaultParty },
    },
  ]);
}

/**
 * Record COD cash collection by a rider.
 */
async function recordCODCollection(tx, opts) {
  const { orderId, riderProfileId, amount } = opts;

  return postLedgerEntries(tx, [
    {
      type: 'CREDIT',
      party: 'RIDER',
      partyId: riderProfileId,
      riderProfileId,
      amount,
      entryType: 'COD_COLLECTION',
      orderId,
      description: `COD cash collected for order #${orderId}`,
      metadata: { orderId, riderProfileId },
    },
  ]);
}

/**
 * Record COD cash remittance by a rider (to admin or via Razorpay).
 */
async function recordCODRemittance(tx, opts) {
  const { riderProfileId, amount, remittanceId, mode } = opts;

  return postLedgerEntries(tx, [
    {
      type: 'DEBIT',
      party: 'RIDER',
      partyId: riderProfileId,
      riderProfileId,
      amount,
      entryType: 'COD_REMITTANCE',
      description: `COD remittance via ${mode}`,
      metadata: { remittanceId, mode },
    },
  ]);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  postLedgerEntries,
  recordVendorCredit,
  recordRiderCredit,
  recordPayout,
  recordRefund,
  recordCODCollection,
  recordCODRemittance,
  calcGatewayFee,
  RAZORPAY_EFFECTIVE_RATE,
  RAZORPAY_BASE_RATE,
  RAZORPAY_GST_RATE,
};

