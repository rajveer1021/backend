const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes with admin middleware
router.use(protect, isAdmin);

router.get('/users', adminController.getAllUsers);
router.get('/vendors/submissions', adminController.getVendorSubmissions);
router.put('/vendors/:vendorId/verify', adminController.verifyVendor);
router.get('/products', adminController.getAllProducts);
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;