const express = require('express');
const subscriptionController = require('../controllers/subscription.controller');
const router = express.Router();

// Create subscription
router.post('/', subscriptionController.createSubscription);

// Get all subscriptions
router.get('/', subscriptionController.getAllSubscriptions);

// Get subscription by ID
router.get('/:id', subscriptionController.getSubscriptionById);

// Update subscription
router.put('/:id', subscriptionController.updateSubscription);

// Delete subscription
router.delete('/:id', subscriptionController.deleteSubscription);

module.exports = router;