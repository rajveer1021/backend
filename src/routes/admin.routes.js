// src/routes/admin.routes.js - Enhanced with vendor and buyer management

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { 
  vendorFilterSchema, 
  buyerFilterSchema, 
  bulkVerifySchema,
  universalSearchSchema 
} = require('../validators/admin.validator');

const router = express.Router();

// Protect all routes with admin middleware
router.use(protect, isAdmin);

// ===== EXISTING ROUTES =====
router.get('/users', adminController.getAllUsers);
router.get('/vendors/submissions', adminController.getVendorSubmissions);
router.put('/vendors/:vendorId/verify', adminController.verifyVendor);
router.get('/products', adminController.getAllProducts);
router.get('/dashboard/stats', adminController.getDashboardStats);

// ===== NEW ENHANCED VENDOR MANAGEMENT ROUTES =====

/**
 * GET /api/admin/vendors
 * Get vendors with advanced search and filtering
 * Query params: page, limit, search, vendorType, verificationStatus, sortBy, sortOrder
 */
router.get('/vendors', validate(vendorFilterSchema), adminController.getVendors);

/**
 * GET /api/admin/vendors/stats
 * Get vendor filter statistics (counts by type, verification status, etc.)
 */
router.get('/vendors/stats', adminController.getVendorStats);

// ===== NEW BUYER MANAGEMENT ROUTES =====

/**
 * GET /api/admin/buyers
 * Get buyers with search and filtering
 * Query params: page, limit, search, sortBy, sortOrder
 */
router.get('/buyers', validate(buyerFilterSchema), adminController.getBuyers);

/**
 * GET /api/admin/buyers/stats
 * Get buyer statistics (total count, Google vs regular users, etc.)
 */
router.get('/buyers/stats', adminController.getBuyerStats);

// ===== BULK ACTIONS ROUTES =====

/**
 * PUT /api/admin/vendors/bulk-verify
 * Bulk verify/unverify multiple vendors
 * Body: { vendorIds: string[], verified: boolean }
 */
router.put('/vendors/bulk-verify', validate(bulkVerifySchema), adminController.bulkVerifyVendors);

// ===== UNIVERSAL SEARCH ROUTE =====

/**
 * GET /api/admin/search
 * Universal search across users, vendors, and products
 * Query params: q (search term), limit
 */
router.get('/search', validate(universalSearchSchema), adminController.universalSearch);

module.exports = router;