const express = require('express');
const inquiryController = require('../controllers/inquiry.controller');
const { protect, isVendor } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

// Buyer routes
router.post('/', inquiryController.createInquiry);

// Vendor routes
router.get('/vendor', isVendor, inquiryController.getVendorInquiries);
router.put('/:id/status', isVendor, inquiryController.updateInquiryStatus);

module.exports = router;