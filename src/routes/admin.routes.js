const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const { 
  vendorVerificationSchema
} = require('../validators/admin.validator');

const router = express.Router();

// Protect all routes with admin middleware
router.use(protect, isAdmin);

// ===== CORE ADMIN ROUTES =====
router.get('/users', adminController.getAllUsers);
router.get('/products', adminController.getAllProducts);

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


/**
 * GET /api/admin/dashboard/kpis - Get comprehensive dashboard KPIs and metrics
 * Returns detailed KPIs including growth trends, distributions, and insights
 */
router.get('/dashboard/kpis', adminController.getDashboardKPIs);

/**
 * GET /api/admin/dashboard/summary - Get quick dashboard summary
 * Returns essential metrics for dashboard overview
 */
router.get('/dashboard/summary', adminController.getDashboardSummary);

/**
 * GET /api/admin/dashboard/activities - Get recent platform activities
 * Returns timeline of recent user registrations, verifications, etc.
 */
router.get('/dashboard/activities', adminController.getRecentActivities);

/**
 * GET /api/admin/dashboard/daily-stats - Get daily statistics for charts
 * Query parameters:
 * - days: Number of days to fetch (default: 30)
 */
router.get('/dashboard/daily-stats', adminController.getDailyStats);

/**
 * GET /api/admin/dashboard/alerts - Get system alerts and notifications
 * Returns alerts for pending actions, low performance indicators, etc.
 */
router.get('/dashboard/alerts', adminController.getDashboardAlerts);

// Keep existing dashboard route for backward compatibility
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;