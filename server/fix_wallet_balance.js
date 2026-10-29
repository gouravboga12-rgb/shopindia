'use strict';
/**
 * fix_wallet_balance.js
 * One-time script to correct Gourav's wallet balance after double-decrement bug.
 *
 * The bug: When a rider submitted a payout request, wallet was decremented immediately.
 * Then when Super Admin disbursed, wallet was decremented AGAIN. This caused -₹180.
 *
 * Fix:
 *  - Going forward: payout-request creation no longer decrements wallet (only disbursal does).
 *  - This script corrects the current -₹180 to ₹0 (the correct value after the ₹180 disbursal).
 *    Reasoning: The rider earned ₹180 (3 trips × ₹60). The ₹180 payout was disbursed.
 *    So the correct net wallet = ₹180 earnings - ₹180 payout = ₹0.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find Gourav's rider profile
  const user = await prisma.user.findFirst({
    where: { phone: '9553921237' },
    include: { riderProfile: true },
  });

  if (!user) {
    console.log('❌ User with phone 9553921237 not found.');
    return;
  }

  const profile = user.riderProfile;
  if (!profile) {
    console.log('❌ No riderProfile for this user.');
    return;
  }

  console.log(`Found rider: ${user.name} | Profile ID: ${profile.id}`);
  console.log(`Current walletBalance: ₹${profile.walletBalance}`);

  // The rider earned ₹180 in deliveries (3 × ₹60) and the payout of ₹180 was disbursed.
  // Correct balance = ₹0 (earnings fully paid out).
  // But the wallet shows -₹180 due to double decrement.
  // We reset it to ₹0.
  const corrected = await prisma.riderProfile.update({
    where: { id: profile.id },
    data: { walletBalance: 0 },
  });

  console.log(`✅ Wallet corrected to: ₹${corrected.walletBalance}`);

  // Also post a corrective ledger entry for audit trail
  await prisma.ledgerEntry.create({
    data: {
      type: 'CREDIT',
      party: 'RIDER',
      partyId: profile.id,
      riderProfileId: profile.id,
      amount: 180,
      entryType: 'OPENING_BALANCE',
      description: 'Wallet balance correction: removed duplicate payout-request pre-deduction. Correct balance after ₹180 disbursal = ₹0.',
      metadata: {
        correctionReason: 'double_decrement_bug_fix',
        correctedAt: new Date().toISOString(),
        previousBalance: profile.walletBalance,
        correctedTo: 0,
      },
    },
  });

  console.log('✅ Audit ledger entry posted.');
  console.log('Done. Rider wallet is now ₹0 which is correct after ₹180 payout disbursed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

