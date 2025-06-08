const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SubscriptionService {
  async createSubscription(data) {
    try {
      // Process the data to match the expected format
      const processedData = {
        name: data.name,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isPopular: data.isPopular !== undefined ? data.isPopular : false,
        limits: data.limits || {},
        subscribers: 0, // Default to 0 for new plans
      };

      const subscription = await prisma.subscription.create({
        data: processedData
      });

      return subscription;
    } catch (error) {
      console.error('Create subscription service error:', error);
      
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        throw new Error('A subscription plan with this name already exists');
      }
      
      throw new Error(error.message || 'Failed to create subscription plan');
    }
  }

  async getAllSubscriptions() {
    try {
      const subscriptions = await prisma.subscription.findMany({
        orderBy: [
          { isPopular: 'desc' }, // Popular plans first
          { isActive: 'desc' },  // Active plans before inactive
          { createdAt: 'desc' }  // Newest first
        ]
      });

      return subscriptions;
    } catch (error) {
      console.error('Get all subscriptions service error:', error);
      throw new Error(error.message || 'Failed to retrieve subscription plans');
    }
  }

  async getSubscriptionById(id) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id }
      });

      return subscription;
    } catch (error) {
      console.error('Get subscription by ID service error:', error);
      throw new Error(error.message || 'Failed to retrieve subscription plan');
    }
  }

  async updateSubscription(id, data) {
    try {
      // Filter out undefined values
      const updateData = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isPopular !== undefined) updateData.isPopular = data.isPopular;
      if (data.limits !== undefined) updateData.limits = data.limits;

      // Add updated timestamp
      updateData.updatedAt = new Date();

      const subscription = await prisma.subscription.update({
        where: { id },
        data: updateData
      });

      return subscription;
    } catch (error) {
      console.error('Update subscription service error:', error);
      
      // Handle unique constraint violations
      if (error.code === 'P2002') {
        throw new Error('A subscription plan with this name already exists');
      }
      
      // Handle record not found
      if (error.code === 'P2025') {
        throw new Error('Subscription plan not found');
      }
      
      throw new Error(error.message || 'Failed to update subscription plan');
    }
  }

  async deleteSubscription(id) {
    try {
      const result = await prisma.subscription.delete({
        where: { id }
      });

      return result;
    } catch (error) {
      console.error('Delete subscription service error:', error);
      
      // Handle record not found
      if (error.code === 'P2025') {
        throw new Error('Subscription plan not found');
      }
      
      throw new Error(error.message || 'Failed to delete subscription plan');
    }
  }

  async getSubscriptionStats() {
    try {
      const subscriptions = await prisma.subscription.findMany();
      
      const stats = {
        totalPlans: subscriptions.length,
        activePlans: subscriptions.filter(sub => sub.isActive).length,
        inactivePlans: subscriptions.filter(sub => !sub.isActive).length,
        popularPlans: subscriptions.filter(sub => sub.isPopular).length,
        totalSubscribers: subscriptions.reduce((sum, sub) => sum + (sub.subscribers || 0), 0),
        totalRevenue: subscriptions.reduce((sum, sub) => {
          return sum + ((sub.subscribers || 0) * (sub.price || 0));
        }, 0),
        averagePrice: subscriptions.length > 0 
          ? subscriptions.reduce((sum, sub) => sum + (sub.price || 0), 0) / subscriptions.length 
          : 0
      };

      return stats;
    } catch (error) {
      console.error('Get subscription stats service error:', error);
      throw new Error(error.message || 'Failed to retrieve subscription statistics');
    }
  }

  async updateSubscriptionSubscribers(id, subscribersCount) {
    try {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: { 
          subscribers: subscribersCount,
          updatedAt: new Date()
        }
      });

      return subscription;
    } catch (error) {
      console.error('Update subscription subscribers service error:', error);
      
      if (error.code === 'P2025') {
        throw new Error('Subscription plan not found');
      }
      
      throw new Error(error.message || 'Failed to update subscriber count');
    }
  }
}

module.exports = new SubscriptionService();