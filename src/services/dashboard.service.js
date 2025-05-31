const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

class DashboardService {
  async getVendorDashboardStats(vendorId) {
    try {
      // Get vendor profile verification status
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { verified: true }
      });

      if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
      }

      // Get total products count
      const totalProducts = await prisma.product.count({
        where: { vendorId }
      });

      // Get total inquiries count
      const totalInquiries = await prisma.inquiry.count({
        where: {
          product: {
            vendorId
          }
        }
      });

      // Get stock statistics
      const [inStock, outOfStock, lowStock] = await Promise.all([
        // Products with stock > 10 (considering as in stock)
        prisma.product.count({
          where: {
            vendorId,
            stock: { gt: 10 },
            isActive: true
          }
        }),
        // Products with stock = 0 (out of stock)
        prisma.product.count({
          where: {
            vendorId,
            stock: 0,
            isActive: true
          }
        }),
        // Products with stock between 1-10 (low stock)
        prisma.product.count({
          where: {
            vendorId,
            stock: { gt: 0, lte: 10 },
            isActive: true
          }
        })
      ]);

      return {
        isProfileVerified: vendor.verified,
        totalProducts,
        totalInquiries,
        inStock,
        outOfStock,
        lowStock
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DashboardService();