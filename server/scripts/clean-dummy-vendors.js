'use strict';
require('dotenv').config();
const prisma = require('../lib/prisma');

async function main() {
  const dummyVendorIds = [
    '08139415-5e58-4eb7-bd36-e9ee3d7ec75f', // djgf
    '993d88fd-4d5c-4e0c-bdd6-27359f34ebcc', // Quick Shoot Up
    '2bb9c7b6-2a0e-426b-8186-d732f2a9fd7e', // kumar stores
    '4b0d0148-2589-4adb-9e3d-1d6d99ba812e', // demobusiness
  ];

  console.log('--- Step 1: Removing 4 Dummy Vendor Accounts ---');

  for (const vendorId of dummyVendorIds) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: { select: { id: true } },
        orders: { select: { id: true } },
      },
    });

    if (!vendor) {
      console.log(`[SKIP] Vendor ${vendorId} not found or already deleted.`);
      continue;
    }

    if (vendor.businessName.includes('ShopIndia Demo')) {
      console.warn(`[SAFETY TRIGGERED] Refusing to delete legitimate store: ${vendor.businessName}`);
      continue;
    }

    console.log(`Found dummy vendor: "${vendor.businessName}" (${vendor.id}), linked user: ${vendor.userId}`);

    // Clean linked documents, payout requests, ledger entries
    await prisma.vendorDocument.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.payoutRequest.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.ledgerEntry.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.ticket.deleteMany({ where: { vendorId } }).catch(() => {});

    // Delete vendor record
    await prisma.vendor.delete({ where: { id: vendorId } });
    console.log(`-> Successfully deleted Vendor record for "${vendor.businessName}"`);

    // Delete linked user if role is vendor
    if (vendor.userId) {
      const user = await prisma.user.findUnique({ where: { id: vendor.userId } });
      if (user && user.role === 'vendor') {
        await prisma.user.delete({ where: { id: vendor.userId } }).catch((e) => console.warn('Could not delete user:', e.message));
        console.log(`-> Cleaned up linked dummy user "${user.email}" (${user.id})`);
      }
    }
  }

  console.log('\n--- Step 2: Removing Duplicate / Unapproved Dummy Rider (Gourav New) ---');
  const dummyRider = await prisma.riderProfile.findFirst({
    where: {
      user: { email: 'gourav_new@gmail.com' },
    },
    include: { user: true },
  });

  if (dummyRider) {
    console.log(`Found duplicate dummy rider: "${dummyRider.user?.name}" (${dummyRider.id})`);
    await prisma.delivery.deleteMany({ where: { riderProfileId: dummyRider.id } }).catch(() => {});
    await prisma.riderProfile.delete({ where: { id: dummyRider.id } });
    if (dummyRider.userId) {
      await prisma.user.delete({ where: { id: dummyRider.userId } }).catch(() => {});
    }
    console.log('-> Successfully deleted duplicate dummy rider "Gourav New".');
  } else {
    console.log('-> Duplicate dummy rider "Gourav New" not found or already removed.');
  }

  // Count remaining vendors
  const remainingVendors = await prisma.vendor.findMany({
    select: { id: true, businessName: true, email: true, phone: true },
  });
  console.log(`\nRemaining Active Vendors (${remainingVendors.length}):`);
  remainingVendors.forEach((v, idx) => {
    console.log(` ${idx + 1}. "${v.businessName}" (${v.email}) - ID: ${v.id}`);
  });

  // Count remaining riders
  const remainingRiders = await prisma.riderProfile.findMany({
    include: { user: { select: { name: true, phone: true, email: true } } },
  });
  console.log(`\nRemaining Active Verified Fleet (${remainingRiders.length}):`);
  remainingRiders.forEach((r, idx) => {
    console.log(` ${idx + 1}. "${r.user?.name}" (${r.user?.phone}) - Approved: ${r.isApproved}, Online: ${r.isOnline}`);
  });

  console.log('\n--- Cleanup Finished Successfully ---');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during cleanup:', err);
    process.exit(1);
  });
