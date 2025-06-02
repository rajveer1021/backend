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

      // Get total products count - only count active/non-deleted products
      const totalProducts = await prisma.product.count({
        where: { 
          vendorId,
          isActive: true // This was missing in your original code!
        }
      });

      // Get total inquiries count - only for active products
      const totalInquiries = await prisma.inquiry.count({
        where: {
          product: {
            vendorId,
            isActive: true
          }
        }
      });

      // Get stock statistics - ensure we only count active products
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

      // Optional: Add debugging information (remove in production)

      return {
        isProfileVerified: vendor.verified,
        totalProducts,
        totalInquiries,
        inStock,
        outOfStock,
        lowStock
      };
    } catch (error) {
      console.error('Error in getVendorDashboardStats:', error);
      throw error;
    }
  }

  // Add this helper method to debug product counts
  async debugProductCounts(vendorId) {
    try {
      const allProducts = await prisma.product.count({
        where: { vendorId }
      });

      const activeProducts = await prisma.product.count({
        where: { 
          vendorId,
          isActive: true 
        }
      });

      const inactiveProducts = await prisma.product.count({
        where: { 
          vendorId,
          isActive: false 
        }
      });

      // If using soft deletes with isActive flag
      const deletedProducts = await prisma.product.count({
        where: { 
          vendorId,
          isActive: false
        }
      });


      return {
        allProducts,
        activeProducts,
        inactiveProducts,
        deletedProducts
      };
    } catch (error) {
      console.error('Error in debugProductCounts:', error);
      throw error;
    }
  }
}

module.exports = new DashboardService();