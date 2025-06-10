const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

class AdminService {
  async getAllUsers(page = 1, limit = 10, accountType) {
    const skip = (page - 1) * limit;
    
    const where = {};
    if (accountType) {
      where.accountType = accountType;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          accountType: true,
          createdAt: true,
          vendor: {
            select: {
              id: true,
              verified: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getVendorSubmissions(page = 1, limit = 10, verified) {
    const skip = (page - 1) * limit;
<<<<<<< Updated upstream
    
    const where = {};
=======

    const where = {
      profileStep: 3,
      verificationType: 'manual' // Only vendors who completed all steps
    };

    // Enhanced filtering by verification status
>>>>>>> Stashed changes
    if (verified !== undefined) {
      where.verified = verified === 'true';
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return {
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async verifyVendor(vendorId, verified) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { verified },
    });

    return updatedVendor;
  }

  async getAllProducts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.product.count(),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalVendors,
      totalProducts,
      totalInquiries,
      verifiedVendors,
      pendingVendors,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.product.count(),
      prisma.inquiry.count(),
      prisma.vendor.count({ where: { verified: true } }),
      prisma.vendor.count({ where: { verified: false } }),
    ]);

    return {
      totalUsers,
      totalVendors,
      totalProducts,
      totalInquiries,
      verifiedVendors,
      pendingVendors,
    };
  }
}

module.exports = new AdminService();