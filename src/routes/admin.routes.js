// src/routes/admin.routes.js - Quick fix: Remove validation for GET routes

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { 
  bulkVerifySchema,
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
 * GET /api/admin/vendors - REMOVED VALIDATION FOR NOW
 */
router.get('/vendors', adminController.getVendors);

/**
 * 5. API to list all vendor profiles which are submitted ✅
 * GET /api/admin/vendors/submissions
 */
router.get('/vendors/submissions', adminController.getVendorSubmissions);

/**
 * GET /api/admin/vendors/stats
 */
router.get('/vendors/stats', adminController.getVendorStats);

/**
 * GET /api/admin/vendors/:vendorId
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
 * Body: { vendorIds: string[], verified: boolean }
 */
router.put('/vendors/bulk-verify', validate(bulkVerifySchema), adminController.bulkVerifyVendors);

// ===== BUYER MANAGEMENT ROUTES =====

/**
 * 3. API to list buyers on the platform ✅
 * 4. API to search and filter buyers ✅
 * GET /api/admin/buyers - REMOVED VALIDATION FOR NOW
 */
router.get('/buyers', adminController.getBuyers);

/**
 * GET /api/admin/buyers/stats
 */
router.get('/buyers/stats', adminController.getBuyerStats);

/**
 * GET /api/admin/buyers/:buyerId
 */
router.get('/buyers/:buyerId', adminController.getBuyerDetails);

// ===== UTILITY ROUTES =====

/**
 * GET /api/admin/search - REMOVED VALIDATION FOR NOW
 */
router.get('/search', adminController.universalSearch);

module.exports = router;