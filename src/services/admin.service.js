// src/services/admin.service.js - Enhanced with vendor and buyer management

const prisma = require("../config/database");
const ApiError = require("../utils/ApiError");

class AdminService {
  // ===== EXISTING METHODS =====
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
        orderBy: { createdAt: "desc" },
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

    const where = {};
    if (verified !== undefined) {
      where.verified = verified === "true";
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      throw new ApiError(404, "Vendor not found");
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
        orderBy: { createdAt: "desc" },
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

  // ===== NEW ENHANCED VENDOR MANAGEMENT =====

  /**
   * Get all vendors with advanced search and filtering
   * @param {Object} params - Search and filter parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search term for name/email
   * @param {string} params.vendorType - Filter by vendor type
   * @param {string} params.verificationStatus - Filter by verification status
   * @param {string} params.sortBy - Sort field (name, email, createdAt, businessName)
   * @param {string} params.sortOrder - Sort order (asc, desc)
   */
  async getVendorsWithFilters(params) {
    const {
      page = 1,
      limit = 10,
      search = "",
      vendorType = "",
      verificationStatus = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause for vendors
    const vendorWhere = {};
    const userWhere = {};

    // Search filter - search in user name and email, and vendor business name
    if (search && search.trim()) {
      const searchTerm = search.trim();
      userWhere.OR = [
        {
          firstName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ];

      // Also search in business name
      vendorWhere.OR = [
        {
          businessName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ];
    }

    // Vendor type filter
    if (vendorType && vendorType !== "all") {
      vendorWhere.vendorType = vendorType.toUpperCase();
    }

    // Verification status filter
    if (verificationStatus && verificationStatus !== "all") {
      switch (verificationStatus) {
        case "gst_verified":
          vendorWhere.AND = [{ verified: true }, { verificationType: "gst" }];
          break;
        case "manually_verified":
          vendorWhere.AND = [
            { verified: true },
            { verificationType: "manual" },
          ];
          break;
        case "pending":
          vendorWhere.verified = false;
          break;
        case "verified":
          vendorWhere.verified = true;
          break;
        case "unverified":
          vendorWhere.verified = false;
          break;
      }
    }

    // Combine user and vendor filters
    const combinedWhere = {};
    if (Object.keys(userWhere).length > 0) {
      combinedWhere.user = userWhere;
    }
    Object.assign(combinedWhere, vendorWhere);

    // Build orderBy clause
    let orderBy = {};
    switch (sortBy) {
      case "name":
        orderBy = { user: { firstName: sortOrder.toLowerCase() } };
        break;
      case "email":
        orderBy = { user: { email: sortOrder.toLowerCase() } };
        break;
      case "businessName":
        orderBy = { businessName: sortOrder.toLowerCase() };
        break;
      case "createdAt":
        orderBy = { createdAt: sortOrder.toLowerCase() };
        break;
      case "verified":
        orderBy = { verified: sortOrder.toLowerCase() };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    try {
      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
          where: combinedWhere,
          skip,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                createdAt: true,
                accountType: true,
              },
            },
          },
        }),
        prisma.vendor.count({ where: combinedWhere }),
      ]);

      // Format the response to include verification status details
      const formattedVendors = vendors.map((vendor) => ({
        id: vendor.id,
        userId: vendor.userId,
        user: vendor.user,
        vendorType: vendor.vendorType,
        businessName: vendor.businessName,
        businessAddress1: vendor.businessAddress1,
        businessAddress2: vendor.businessAddress2,
        city: vendor.city,
        state: vendor.state,
        postalCode: vendor.postalCode,
        businessLogo: vendor.businessLogo,
        verified: vendor.verified,
        verificationType: vendor.verificationType,
        verificationStatus: this.getVerificationStatusLabel(vendor),
        gstNumber: vendor.gstNumber,
        idType: vendor.idType,
        profileStep: vendor.profileStep,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      }));

      return {
        vendors: formattedVendors,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        filters: {
          search,
          vendorType,
          verificationStatus,
          sortBy,
          sortOrder,
        },
      };
    } catch (error) {
      console.error("Error in getVendorsWithFilters:", error);
      throw new ApiError(500, `Failed to fetch vendors: ${error.message}`);
    }
  }

  // ===== NEW BUYER MANAGEMENT =====

  /**
   * Get all buyers with search and filtering
   * @param {Object} params - Search and filter parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search term for name/email
   * @param {string} params.sortBy - Sort field (name, email, createdAt)
   * @param {string} params.sortOrder - Sort order (asc, desc)
   */
  async getBuyersWithFilters(params) {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      accountType: "BUYER",
    };

    // Search filter - search in name and email
    if (search && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        {
          firstName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ];
    }

    // Build orderBy clause
    let orderBy = {};
    switch (sortBy) {
      case "name":
        orderBy = { firstName: sortOrder.toLowerCase() };
        break;
      case "email":
        orderBy = { email: sortOrder.toLowerCase() };
        break;
      case "createdAt":
        orderBy = { createdAt: sortOrder.toLowerCase() };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    try {
      const [buyers, total, buyerStats] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountType: true,
            googleId: true,
            createdAt: true,
            updatedAt: true,
            inquiries: {
              select: {
                id: true,
                createdAt: true,
                status: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
        // Get additional stats for each buyer
        prisma.user.findMany({
          where,
          select: {
            id: true,
            _count: {
              select: {
                inquiries: true,
              },
            },
          },
        }),
      ]);

      // Format the response to include inquiry statistics
      const formattedBuyers = buyers.map((buyer) => {
        const inquiryCount = buyer.inquiries.length;
        const activeInquiries = buyer.inquiries.filter(
          (inq) => inq.status === "OPEN"
        ).length;

        return {
          id: buyer.id,
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          fullName: `${buyer.firstName} ${buyer.lastName}`.trim(),
          email: buyer.email,
          accountType: buyer.accountType,
          isGoogleUser: !!buyer.googleId,
          totalInquiries: inquiryCount,
          activeInquiries,
          createdAt: buyer.createdAt,
          updatedAt: buyer.updatedAt,
        };
      });

      return {
        buyers: formattedBuyers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        filters: {
          search,
          sortBy,
          sortOrder,
        },
      };
    } catch (error) {
      console.error("Error in getBuyersWithFilters:", error);
      throw new ApiError(500, `Failed to fetch buyers: ${error.message}`);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Get human-readable verification status label
   */
  getVerificationStatusLabel(vendor) {
    if (!vendor.verified) {
      return "Pending";
    }

    if (vendor.verificationType === "gst") {
      return "GST Verified";
    } else if (vendor.verificationType === "manual") {
      return "Manually Verified";
    }

    return "Verified";
  }

  /**
   * Get vendor statistics for filters
   */
  async getVendorFilterStats() {
    try {
      const [vendorTypes, verificationStats] = await Promise.all([
        prisma.vendor.groupBy({
          by: ["vendorType"],
          _count: { vendorType: true },
        }),
        prisma.vendor.groupBy({
          by: ["verified", "verificationType"],
          _count: { verified: true },
        }),
      ]);

      return {
        vendorTypes: vendorTypes.map((item) => ({
          type: item.vendorType,
          count: item._count.vendorType,
        })),
        verificationStats: verificationStats.map((item) => ({
          verified: item.verified,
          verificationType: item.verificationType,
          count: item._count.verified,
        })),
      };
    } catch (error) {
      console.error("Error in getVendorFilterStats:", error);
      throw new ApiError(500, "Failed to fetch vendor filter statistics");
    }
  }

  /**
   * Get buyer statistics
   */
  async getBuyerFilterStats() {
    try {
      const [totalBuyers, googleUsers, regularUsers] = await Promise.all([
        prisma.user.count({ where: { accountType: "BUYER" } }),
        prisma.user.count({
          where: {
            accountType: "BUYER",
            googleId: { not: null },
          },
        }),
        prisma.user.count({
          where: {
            accountType: "BUYER",
            googleId: null,
          },
        }),
      ]);

      return {
        totalBuyers,
        googleUsers,
        regularUsers,
      };
    } catch (error) {
      console.error("Error in getBuyerFilterStats:", error);
      throw new ApiError(500, "Failed to fetch buyer filter statistics");
    }
  }
}

module.exports = new AdminService();
