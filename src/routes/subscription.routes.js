const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(protect);

// Get subscription statistics
router.get('/stats', subscriptionController.getSubscriptionStats);

// Create subscription plan
router.post('/', subscriptionController.createSubscription);

// Get all subscription plans
router.get('/', subscriptionController.getAllSubscriptions);

// Get subscription plan by ID
router.get('/:id', subscriptionController.getSubscriptionById);

// Update subscription plan
router.put('/:id', subscriptionController.updateSubscription);

// Update subscription plan status (activate/deactivate)
router.put('/:id/status', subscriptionController.updateSubscriptionStatus);

// Delete subscription plan
router.delete('/:id', subscriptionController.deleteSubscription);

module.exports = router;