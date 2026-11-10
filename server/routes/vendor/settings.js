'use strict';
/**
 * server/routes/vendor/settings.js
 * Vendor Store Settings & Profile Management.
 * Includes GPS coordinates, delivery radius, banking info, and UPI ID.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../../lib/prisma');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { registerPickupLocation } = require('../../lib/shiprocket');
const { uploadToS3 } = require('../../lib/s3');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(verifyToken, requireRole('vendor'));

/**
 * GET /api/vendor/settings
 * Returns the current vendor's complete store settings and banking details.
 */
router.get('/', async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ error: 'Vendor profile not found.' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        documents: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    res.json({ success: true, settings: vendor });
  } catch (err) {
    console.error('[VendorSettings] GET error:', err);
    res.status(500).json({ error: err.message || 'Failed to load vendor settings.' });
  }
});

/** POST /api/vendor/settings/upload-doc — Upload KYC Document */
router.post('/upload-doc', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const docType = req.body.docType || 'kyc';
    const cleanName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `vendors/docs/${Date.now()}_${docType}_${cleanName}`;
    const result = await uploadToS3({
      key,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    });
    res.json({ url: result.url, key: result.key, name: req.file.originalname });
  } catch (err) {
    console.error('Vendor document upload error:', err);
    res.status(500).json({ error: err.message || 'File upload failed.' });
  }
});

/** POST /api/vendor/settings/documents — Add or update KYC document */
router.post('/documents', async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and document URL required.' });

    // If document with same name exists, update it, otherwise create
    const existing = await prisma.vendorDocument.findFirst({
      where: { vendorId, name },
    });

    let doc;
    if (existing) {
      doc = await prisma.vendorDocument.update({
        where: { id: existing.id },
        data: { url, uploadedAt: new Date() },
      });
    } else {
      doc = await prisma.vendorDocument.create({
        data: { vendorId, name, url },
      });
    }

    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/vendor/settings
 * Updates vendor profile, location, quick commerce settings, and banking details.
 * Any modification to banking/UPI details is logged to SettingsAuditLog for compliance.
 */
router.put('/', async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ error: 'Vendor profile not found.' });
    }

    const currentVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!currentVendor) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    const {
      businessName,
      contactName,
      phone,
      street,
      city,
      state,
      pincode,
      gstNumber,
      panNumber,
      lat,
      lng,
      deliveryRadiusKm,
      supportsQuick,
      description,
      category,
      logo,
      isActive,
      isOnline,
      // Banking details
      accountHolder,
      accountNumber,
      ifsc,
      bankName,
      upiId,
    } = req.body;

    // Detect if financial banking details changed
    const bankChanged =
      (accountNumber !== undefined && accountNumber !== currentVendor.accountNumber) ||
      (ifsc !== undefined && ifsc !== currentVendor.ifsc) ||
      (accountHolder !== undefined && accountHolder !== currentVendor.accountHolder) ||
      (bankName !== undefined && bankName !== currentVendor.bankName) ||
      (upiId !== undefined && upiId !== currentVendor.upiId);

    // Build update data
    const updateData = {};
    if (businessName !== undefined) updateData.businessName = businessName.trim();
    if (contactName !== undefined) updateData.contactName = contactName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (street !== undefined) updateData.street = street?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (state !== undefined) updateData.state = state?.trim() || null;
    if (pincode !== undefined) updateData.pincode = pincode?.trim() || null;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber?.trim() || null;
    if (panNumber !== undefined) updateData.panNumber = panNumber?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (logo !== undefined) updateData.logo = logo?.trim() || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (isOnline !== undefined) updateData.isOnline = Boolean(isOnline);

    // Hyper-local quick commerce settings: strictly locked to 5 km - 10 km
    if (lat !== undefined) updateData.lat = lat !== null && lat !== '' ? parseFloat(lat) : null;
    if (lng !== undefined) updateData.lng = lng !== null && lng !== '' ? parseFloat(lng) : null;
    if (deliveryRadiusKm !== undefined) {
      const radius = parseFloat(deliveryRadiusKm);
      updateData.deliveryRadiusKm = isNaN(radius) || radius <= 0 ? 5 : Math.min(10, Math.max(5, radius));
    }
    if (supportsQuick !== undefined) updateData.supportsQuick = Boolean(supportsQuick);

    // Banking details
    if (accountHolder !== undefined) updateData.accountHolder = accountHolder?.trim() || null;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber?.trim() || null;
    if (ifsc !== undefined) updateData.ifsc = ifsc?.trim().toUpperCase() || null;
    if (bankName !== undefined) updateData.bankName = bankName?.trim() || null;
    if (upiId !== undefined) updateData.upiId = upiId?.trim().toLowerCase() || null;

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
    });

    // Auto-sync vendor store address as Shiprocket 3PL pickup location
    if (updatedVendor.street && updatedVendor.city && updatedVendor.pincode) {
      registerPickupLocation(updatedVendor).catch(err =>
        console.warn('[VendorSettings] Background Shiprocket pickup registration warning:', err.message)
      );
    }

    // Write audit log and sync pending payout requests if banking or UPI details were modified
    if (bankChanged) {
      // Auto-sync any open pending payout requests with the updated bank / UPI snapshot
      await prisma.payoutRequest.updateMany({
        where: {
          partyType: 'VENDOR',
          partyId: vendorId,
          status: 'pending'
        },
        data: {
          bankSnapshot: {
            accountHolder: updatedVendor.accountHolder,
            accountNumber: updatedVendor.accountNumber,
            ifsc: updatedVendor.ifsc,
            bankName: updatedVendor.bankName,
            upiId: updatedVendor.upiId
          }
        }
      }).catch(err => console.warn('[VendorSettings] Payout requests bank sync warning:', err.message));

      await prisma.settingsAuditLog.create({
        data: {
          settingKey: `vendor_payout_details_${vendorId}`,
          oldValue: JSON.stringify({
            accountHolder: currentVendor.accountHolder,
            accountNumber: currentVendor.accountNumber ? `••••${currentVendor.accountNumber.slice(-4)}` : null,
            ifsc: currentVendor.ifsc,
            bankName: currentVendor.bankName,
            upiId: currentVendor.upiId,
          }),
          newValue: JSON.stringify({
            accountHolder: updatedVendor.accountHolder,
            accountNumber: updatedVendor.accountNumber ? `••••${updatedVendor.accountNumber.slice(-4)}` : null,
            ifsc: updatedVendor.ifsc,
            bankName: updatedVendor.bankName,
            upiId: updatedVendor.upiId,
          }),
          changedBy: req.user.userId || vendorId,
        },
      }).catch(err => console.warn('[VendorSettings] Audit log error:', err.message));
    }

    res.json({
      success: true,
      message: 'Store settings updated successfully.',
      settings: updatedVendor,
    });
  } catch (err) {
    console.error('[VendorSettings] PUT error:', err);
    res.status(500).json({ error: err.message || 'Failed to update store settings.' });
  }
});

/**
 * PATCH /api/vendor/settings/status
 * PUT /api/vendor/settings/toggle-online
 * Toggle Vendor Store Online/Offline status
 */
const handleStatusToggle = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    if (!vendorId) {
      return res.status(403).json({ error: 'Vendor profile not found.' });
    }

    const { isOnline } = req.body;
    let nextStatus = isOnline !== undefined ? Boolean(isOnline) : undefined;

    if (nextStatus === undefined) {
      const current = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { isOnline: true },
      });
      nextStatus = !current?.isOnline;
    }

    const updated = await prisma.vendor.update({
      where: { id: vendorId },
      data: { isOnline: nextStatus },
      select: {
        id: true,
        businessName: true,
        isOnline: true,
        isActive: true,
      },
    });

    try {
      const { notifyVendorStatus } = require('../../lib/socket');
      notifyVendorStatus(vendorId, { isOnline: updated.isOnline, businessName: updated.businessName });
    } catch (_) {}

    res.json({
      success: true,
      isOnline: updated.isOnline,
      businessName: updated.businessName,
      message: updated.isOnline ? 'Store is now ONLINE and receiving orders.' : 'Store is now OFFLINE. New orders are paused.',
    });
  } catch (err) {
    console.error('[VendorSettings] status toggle error:', err);
    res.status(500).json({ error: err.message || 'Failed to toggle vendor status.' });
  }
};

router.patch('/status', handleStatusToggle);
router.put('/toggle-online', handleStatusToggle);

module.exports = router;
