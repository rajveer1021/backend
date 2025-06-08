// src/routes/admin.routes.js - Updated with rejection handling routes

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { 
  vendorVerificationSchema,
  vendorSubmissionQuerySchema,
  dashboardQuerySchema 
} = require('../validators/admin.validator');

const router = express.Router();

// Protect all routes with admin middleware
router.use(protect, isAdmin);

// ===== SIMPLIFIED DASHBOARD ROUTES =====

/**
 * API 1: Get Core KPIs (Total Users, Vendors, Products, Inquiries, Platform Health)
 * GET /api/admin/dashboard/core-kpis
 */
router.get('/dashboard/core-kpis', adminController.getCoreKPIs);

/**
 * API 2: Get Activity Metrics (Pending Verifications, Open Inquiries, Active Products, Verification Rate)
 * GET /api/admin/dashboard/activity-metrics
 */
router.get('/dashboard/activity-metrics', adminController.getActivityMetrics);

/**
 * API 3: Get Recent Activities
 * GET /api/admin/dashboard/recent-activities
 * Query parameters:
 * - limit: Number of activities to fetch (default: 10)
 */
router.get('/dashboard/recent-activities', 
  validate(dashboardQuerySchema), 
  adminController.getRecentActivities
);

// ===== CORE ADMIN ROUTES =====
router.get('/users', adminController.getAllUsers);
router.get('/products', adminController.getAllProducts);

// ===== VENDOR MANAGEMENT ROUTES =====

/**
 * 1. API to list all vendors on the platform ✅
 * 2. API to search and filter vendors ✅
 * GET /api/admin/vendors
 */
router.get('/vendors', adminController.getVendors);

/**
 * 5. API to list all vendor profiles which are submitted ✅
 * GET /api/admin/vendors/submissions
 */
router.get('/vendors/submissions', 
  validate(vendorSubmissionQuerySchema), 
  adminController.getVendorSubmissions
);

/**
 * GET /api/admin/vendors/stats
 */
router.get('/vendors/stats', adminController.getVendorStats);

/**
 * NEW: Get vendor rejection statistics
 * GET /api/admin/vendors/rejection-stats
 */
router.get('/vendors/rejection-stats', adminController.getRejectionStats);

/**
 * GET /api/admin/vendors/:vendorId
 */
router.get('/vendors/:vendorId', adminController.getVendorDetails);

/**
 * NEW: Get vendor rejection details
 * GET /api/admin/vendors/:vendorId/rejection-details
 */
router.get('/vendors/:vendorId/rejection-details', adminController.getVendorRejectionDetails);

/**
 * 6. API to verify the vendor business profile ✅
 * PUT /api/admin/vendors/:vendorId/verify
 * Body: { verified: boolean, rejectionReason?: string }
 */
router.put('/vendors/:vendorId/verify', 
  validate(vendorVerificationSchema), 
  adminController.verifyVendor
);

/**
 * NEW: Clear vendor rejection and allow resubmission
 * POST /api/admin/vendors/:vendorId/clear-rejection
 */
router.post('/vendors/:vendorId/clear-rejection', adminController.clearVendorRejection);

// ===== BUYER MANAGEMENT ROUTES =====

/**
 * 3. API to list buyers on the platform ✅
 * 4. API to search and filter buyers ✅
 * GET /api/admin/buyers
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

// Keep legacy dashboard route for backward compatibility
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;