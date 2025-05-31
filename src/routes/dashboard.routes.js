const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { protect, isVendor } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes and ensure vendor access
router.use(protect, isVendor);

router.get('/stats', dashboardController.getDashboardStats);

module.exports = router;