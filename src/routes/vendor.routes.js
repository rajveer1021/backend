// src/routes/vendor.routes.js - Updated with rejection handling routes

const express = require('express');
const vendorController = require('../controllers/vendor.controller');
const { protect, isVendor } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validation.middleware');
const {
  vendorStep1Schema,
  vendorStep2Schema,
  vendorStep3Schema,
  productSearchSchema,
} = require('../validators/vendor.validator');

const router = express.Router();

// Protect all routes
router.use(protect, isVendor);

// ===== VERIFICATION STATUS ROUTES =====

/**
 * NEW: Get verification status
 * GET /api/vendor/verification-status
 */
router.get('/verification-status', vendorController.getVerificationStatus);

/**
 * NEW: Check if vendor can resubmit verification
 * GET /api/vendor/resubmission-status
 */
router.get('/resubmission-status', vendorController.checkResubmissionStatus);

/**
 * NEW: Get rejection details (if vendor was rejected)
 * GET /api/vendor/rejection-details
 */
router.get('/rejection-details', vendorController.getRejectionDetails);

// ===== ONBOARDING ROUTES =====

// Step 1: Vendor type selection
router.post('/onboarding/step1', validate(vendorStep1Schema), vendorController.updateStep1);

// Step 2: Business information with optional business logo
router.post(
  '/onboarding/step2',
  upload.single('businessLogo'),
  validate(vendorStep2Schema),
  vendorController.updateStep2
);

// Step 3: Document verification - ENHANCED with rejection handling
router.post(
  '/onboarding/step3',
  upload.fields([
    { name: 'gstDocument', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 5 },
  ]),
  validate(vendorStep3Schema),
  vendorController.updateStep3
);

// ===== RESUBMISSION ROUTES =====

/**
 * NEW: Resubmit verification after rejection
 * POST /api/vendor/resubmit-verification
 * Body: { step: number, ...stepData }
 */
router.post(
  '/resubmit-verification',
  upload.fields([
    { name: 'businessLogo', maxCount: 1 },
    { name: 'gstDocument', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 5 },
  ]),
  vendorController.resubmitVerification
);

// ===== PROFILE MANAGEMENT ROUTES =====

// Profile management - ENHANCED with rejection handling
router.get('/profile', vendorController.getProfile);
router.put(
  '/profile',
  upload.fields([
    { name: 'businessLogo', maxCount: 1 },
    { name: 'gstDocument', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 5 },
  ]),
  vendorController.updateProfile
);

// ===== PRODUCT MANAGEMENT ROUTES =====

// Product search
router.get('/products/search', vendorController.searchProducts);

module.exports = router;