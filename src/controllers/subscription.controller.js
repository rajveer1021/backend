const subscriptionService = require('../services/subscription.service');
const { subscriptionSchema, updateSubscriptionSchema, subscriptionIdSchema } = require('../validators/product.validator');

class SubscriptionController {
  async createSubscription(req, res) {
    try {
      const validatedData = subscriptionSchema.parse(req.body);
      const subscription = await subscriptionService.createSubscription(validatedData);
      
      res.status(201).json({
        success: true,
        data: subscription,
        message: 'Subscription created successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAllSubscriptions(req, res) {
    try {
      const subscriptions = await subscriptionService.getAllSubscriptions();
      
      res.status(200).json({
        success: true,
        data: subscriptions,
        message: 'Subscriptions retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
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
          message: 'Subscription not found'
        });
      }

      res.status(200).json({
        success: true,
        data: subscription,
        message: 'Subscription retrieved successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateSubscription(req, res) {
    try {
      const { id } = subscriptionIdSchema.parse(req.params);
      const validatedData = updateSubscriptionSchema.parse(req.body);
      
      const subscription = await subscriptionService.updateSubscription(id, validatedData);
      
      res.status(200).json({
        success: true,
        data: subscription,
        message: 'Subscription updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteSubscription(req, res) {
    try {
      const { id } = subscriptionIdSchema.parse(req.params);
      await subscriptionService.deleteSubscription(id);
      
      res.status(200).json({
        success: true,
        message: 'Subscription deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new SubscriptionController();