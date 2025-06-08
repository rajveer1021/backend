const subscriptionService = require('../services/subscription.service');
const { subscriptionSchema, updateSubscriptionSchema, subscriptionIdSchema } = require('../validators/subscription.validator');

class SubscriptionController {
  async createSubscription(req, res) {
    try {
      const validatedData = subscriptionSchema.parse(req.body);
      const subscription = await subscriptionService.createSubscription(validatedData);
      
      res.status(201).json({
        success: true,
        data: {
          plan: subscription
        },
        message: 'Subscription plan created successfully'
      });
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create subscription plan'
      });
    }
  }

  async getAllSubscriptions(req, res) {
    try {
      const subscriptions = await subscriptionService.getAllSubscriptions();
      
      // Calculate stats
      const stats = {
        totalPlans: subscriptions.length,
        activePlans: subscriptions.filter(sub => sub.isActive).length,
        totalSubscribers: subscriptions.reduce((sum, sub) => sum + (sub.subscribers || 0), 0),
        totalRevenue: subscriptions.reduce((sum, sub) => sum + ((sub.subscribers || 0) * (sub.price || 0)), 0)
      };
      
      res.status(200).json({
        success: true,
        data: {
          plans: subscriptions,
          stats: stats
        },
        message: 'Subscription plans retrieved successfully'
      });
    } catch (error) {
      console.error('Get all subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve subscription plans'
      });
    }
  }

  async getSubscriptionById(req, res) {
    try {
      const { id } = subscriptionIdSchema.parse(req.params);
      const subscription = await subscriptionService.getSubscriptionById(id);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          plan: subscription
        },
        message: 'Subscription plan retrieved successfully'
      });
    } catch (error) {
      console.error('Get subscription by ID error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to retrieve subscription plan'
      });
    }
  }

  async updateSubscription(req, res) {
    try {
      const { id } = subscriptionIdSchema.parse(req.params);
      const validatedData = updateSubscriptionSchema.parse(req.body);
      
      // Check if subscription exists
      const existingSubscription = await subscriptionService.getSubscriptionById(id);
      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }
      
      const subscription = await subscriptionService.updateSubscription(id, validatedData);
      
      res.status(200).json({
        success: true,
        data: {
          plan: subscription
        },
        message: 'Subscription plan updated successfully'
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update subscription plan'
      });
    }
  }

  async updateSubscriptionStatus(req, res) {
    try {
      const { id } = subscriptionIdSchema.parse(req.params);
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        });
      }
      
      // Check if subscription exists
      const existingSubscription = await subscriptionService.getSubscriptionById(id);
      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }
      
      const subscription = await subscriptionService.updateSubscription(id, { isActive });
      
      res.status(200).json({
        success: true,
        data: {
          plan: subscription
        },
        message: `Subscription plan ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Update subscription status error:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update subscription plan status'
      });
    }
  }

  async deleteSubscription(req, res) {
    try {
      const { id } = subscriptionIdSchema.parse(req.params);
      
      // Check if subscription exists
      const existingSubscription = await subscriptionService.getSubscriptionById(id);
      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }
      
      // Check if subscription has active subscribers (optional business logic)
      if (existingSubscription.subscribers && existingSubscription.subscribers > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete subscription plan with active subscribers'
        });
      }
      
      await subscriptionService.deleteSubscription(id);
      
      res.status(200).json({
        success: true,
        message: 'Subscription plan deleted successfully'
      });
    } catch (error) {
      console.error('Delete subscription error:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Subscription plan not found'
        });
      }
      
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete subscription plan'
      });
    }
  }

  async getSubscriptionStats(req, res) {
    try {
      const stats = await subscriptionService.getSubscriptionStats();
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Subscription statistics retrieved successfully'
      });
    } catch (error) {
      console.error('Get subscription stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve subscription statistics'
      });
    }
  }
}

module.exports = new SubscriptionController();