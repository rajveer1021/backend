// src/routes/admin.routes.js - Enhanced with vendor and buyer management

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { 
  vendorFilterSchema, 
  buyerFilterSchema, 
  bulkVerifySchema,
  universalSearchSchema,
  vendorVerificationSchema
} = require('../validators/admin.validator');

const router = express.Router();

// Protect all routes with admin middleware
router.use(protect, isAdmin);

// ===== CORE ADMIN ROUTES =====
router.get('/users', adminController.getAllUsers);
router.get('/products', adminController.getAllProducts);
router.get('/dashboard/stats', adminController.getDashboardStats);

// ===== VENDOR MANAGEMENT ROUTES =====

/**
 * 1. API to list all vendors on the platform ✅
 * 2. API to search and filter vendors ✅
 * GET /api/admin/vendors
 * Query params: page, limit, search, vendorType, verificationStatus, sortBy, sortOrder
 */
router.get('/vendors', validate(vendorFilterSchema), adminController.getVendors);

/**
 * 5. API to list all vendor profiles which are submitted ✅
 * GET /api/admin/vendors/submissions
 * Query params: page, limit, verified
 */
router.get('/vendors/submissions', adminController.getVendorSubmissions);

/**
 * GET /api/admin/vendors/stats
 * Get vendor filter statistics (counts by type, verification status, etc.)
 */
router.get('/vendors/stats', adminController.getVendorStats);

/**
 * GET /api/admin/vendors/:vendorId
 * Get single vendor details with products and inquiries
 */
router.get('/vendors/:vendorId', adminController.getVendorDetails);

/**
 * 6. API to verify the vendor business profile ✅
 * PUT /api/admin/vendors/:vendorId/verify
 * Body: { verified: boolean }
 */
router.put('/vendors/:vendorId/verify', validate(vendorVerificationSchema), adminController.verifyVendor);

/**
 * PUT /api/admin/vendors/bulk-verify
 * Bulk verify/unverify multiple vendors
 * Body: { vendorIds: string[], verified: boolean }
 */
router.put('/vendors/bulk-verify', validate(bulkVerifySchema), adminController.bulkVerifyVendors);

// ===== BUYER MANAGEMENT ROUTES =====

/**
 * 3. API to list buyers on the platform ✅
 * 4. API to search and filter buyers ✅
 * GET /api/admin/buyers
 * Query params: page, limit, search, sortBy, sortOrder
 */
router.get('/buyers', validate(buyerFilterSchema), adminController.getBuyers);

/**
 * GET /api/admin/buyers/stats
 * Get buyer statistics (total count, Google vs regular users, etc.)
 */
router.get('/buyers/stats', adminController.getBuyerStats);

/**
 * GET /api/admin/buyers/:buyerId
 * Get single buyer details with inquiry history
 */
router.get('/buyers/:buyerId', adminController.getBuyerDetails);

// ===== UTILITY ROUTES =====

/**
 * GET /api/admin/search
 * Universal search across users, vendors, and products
 * Query params: q (search term), limit
 */
router.get('/search', validate(universalSearchSchema), adminController.universalSearch);

module.exports = router;