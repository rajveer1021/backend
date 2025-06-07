const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SubscriptionService {
  async createSubscription(data) {
    return await prisma.subscription.create({
      data
    });
  }

  async getAllSubscriptions() {
    return await prisma.subscription.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getSubscriptionById(id) {
    return await prisma.subscription.findUnique({
      where: { id }
    });
  }

  async updateSubscription(id, data) {
    return await prisma.subscription.update({
      where: { id },
      data
    });
  }

  async deleteSubscription(id) {
    return await prisma.subscription.delete({
      where: { id }
    });
  }
}

module.exports = new SubscriptionService();