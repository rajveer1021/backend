const prisma = require("../config/database");
const ApiError = require("../utils/ApiError");

class AdminService {
  /**
   * Get all users with pagination and filtering
   */
  async getAllUsers(page = 1, limit = 10, accountType) {
    const skip = (page - 1) * limit;

    const where = {};
    if (accountType && accountType !== "all") {
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
          googleId: true,
          createdAt: true,
          vendor: {
            select: {
              id: true,
              verified: true,
              businessName: true,
              vendorType: true,
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
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get vendor submissions for admin review
   */
  async getVendorSubmissions(page = 1, limit = 10, verified) {
    const skip = (page - 1) * limit;

    const where = {
      verified: false,
      profileStep: 3,
      verificationType: "manual",
    };

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
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    // Format vendors with additional info
    const formattedVendors = vendors.map((vendor) => ({
      ...vendor,
      verificationStatus: this.getVerificationStatusLabel(vendor),
      fullName: `${vendor.user.firstName} ${vendor.user.lastName}`.trim(),
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
    };
  }

  /**
   * Verify/Unverify a vendor
   */
  async verifyVendor(vendorId, verified) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new ApiError(404, "Vendor not found");
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { verified },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      ...updatedVendor,
      verificationStatus: this.getVerificationStatusLabel(updatedVendor),
      message: `Vendor ${verified ? "verified" : "unverified"} successfully`,
    };
  }

  /**
   * Get all products with vendor information
   */
  async getAllProducts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        where: { isActive: true }, // Only active products
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
      prisma.product.count({ where: { isActive: true } }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const [
      totalUsers,
      totalVendors,
      totalProducts,
      totalInquiries,
      verifiedVendors,
      pendingVendors,
      totalBuyers,
      googleUsers,
      activeProducts,
      openInquiries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.inquiry.count(),
      prisma.vendor.count({ where: { verified: true } }),
      prisma.vendor.count({ where: { verified: false } }),
      prisma.user.count({ where: { accountType: "BUYER" } }),
      prisma.user.count({ where: { googleId: { not: null } } }),
      prisma.product.count({ where: { isActive: true, stock: { gt: 0 } } }),
      prisma.inquiry.count({ where: { status: "OPEN" } }),
    ]);

    return {
      totalUsers,
      totalVendors,
      totalBuyers,
      totalProducts,
      totalInquiries,
      verifiedVendors,
      pendingVendors,
      googleUsers,
      activeProducts,
      openInquiries,
      stats: {
        userGrowth: await this.getUserGrowthStats(),
        vendorVerificationRate:
          totalVendors > 0
            ? Math.round((verifiedVendors / totalVendors) * 100)
            : 0,
      },
    };
  }

  /**
   * Get vendors with advanced search and filtering
   * 1. API to list all vendors on the platform ✅
   * 2. API to search and filter vendors by name, email, vendor type, verification status ✅
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

    // Build where clause
    const where = {};
    const userWhere = {};

    // Search filter - search in user name and email, and vendor business name
    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Search across user and vendor fields
      where.OR = [
        {
          businessName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          user: {
            OR: [
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
            ],
          },
        },
      ];
    }

    // Vendor type filter
    if (vendorType && vendorType !== "all" && vendorType !== "") {
      where.vendorType = vendorType.toUpperCase();
    }

    // Verification status filter
    if (
      verificationStatus &&
      verificationStatus !== "all" &&
      verificationStatus !== ""
    ) {
      switch (verificationStatus) {
        case "gst_verified":
          where.AND = [{ verified: true }, { verificationType: "gst" }];
          break;
        case "manually_verified":
          where.AND = [{ verified: true }, { verificationType: "manual" }];
          break;
        case "pending":
          where.verified = false;
          break;
        case "verified":
          where.verified = true;
          break;
        case "unverified":
          where.verified = false;
          break;
      }
    }

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
      case "verified":
        orderBy = { verified: sortOrder.toLowerCase() };
        break;
      case "createdAt":
      default:
        orderBy = { createdAt: sortOrder.toLowerCase() };
    }

    try {
      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
          where,
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
                googleId: true,
              },
            },
            _count: {
              select: {
                products: {
                  where: { isActive: true },
                },
              },
            },
          },
        }),
        prisma.vendor.count({ where }),
      ]);

      // Format the response with additional computed fields
      const formattedVendors = vendors.map((vendor) => ({
        id: vendor.id,
        userId: vendor.userId,
        user: {
          ...vendor.user,
          fullName: `${vendor.user.firstName} ${vendor.user.lastName}`.trim(),
          isGoogleUser: !!vendor.user.googleId,
        },
        vendorType: vendor.vendorType,
        businessName: vendor.businessName,
        businessAddress: {
          address1: vendor.businessAddress1,
          address2: vendor.businessAddress2,
          city: vendor.city,
          state: vendor.state,
          postalCode: vendor.postalCode,
          fullAddress: [
            vendor.businessAddress1,
            vendor.businessAddress2,
            vendor.city,
            vendor.state,
            vendor.postalCode,
          ]
            .filter(Boolean)
            .join(", "),
        },
        businessLogo: vendor.businessLogo,
        verified: vendor.verified,
        verificationType: vendor.verificationType,
        verificationStatus: this.getVerificationStatusLabel(vendor),
        verificationDetails: {
          gstNumber: vendor.gstNumber,
          idType: vendor.idType,
          hasDocuments: !!(
            vendor.gstDocument ||
            (vendor.otherDocuments && vendor.otherDocuments.length > 0)
          ),
        },
        profileStep: vendor.profileStep,
        productCount: vendor._count.products,
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
        summary: {
          totalVendors: total,
          verifiedVendors: formattedVendors.filter((v) => v.verified).length,
          pendingVendors: formattedVendors.filter((v) => !v.verified).length,
        },
      };
    } catch (error) {
      console.error("❌ Error in getVendorsWithFilters:", error);
      throw new ApiError(500, `Failed to fetch vendors: ${error.message}`);
    }
  }

  // ===== BUYER MANAGEMENT =====

  /**
   * Get buyers with search and filtering
   * 3. API to list buyers on the platform ✅
   * 4. API to search and filter buyers by name, email ✅
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
      default:
        orderBy = { createdAt: sortOrder.toLowerCase() };
    }

    try {
      const [buyers, total] = await Promise.all([
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
            _count: {
              select: {
                inquiries: true,
              },
            },
            inquiries: {
              select: {
                id: true,
                status: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 5, // Get last 5 inquiries for summary
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Format the response with inquiry statistics
      const formattedBuyers = buyers.map((buyer) => {
        const totalInquiries = buyer._count.inquiries;
        const activeInquiries = buyer.inquiries.filter(
          (inq) => inq.status === "OPEN"
        ).length;
        const recentActivity =
          buyer.inquiries.length > 0
            ? buyer.inquiries[0].createdAt
            : buyer.createdAt;

        return {
          id: buyer.id,
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          fullName: `${buyer.firstName} ${buyer.lastName}`.trim(),
          email: buyer.email,
          accountType: buyer.accountType,
          isGoogleUser: !!buyer.googleId,
          inquiryStats: {
            total: totalInquiries,
            active: activeInquiries,
            completed: totalInquiries - activeInquiries,
          },
          recentActivity,
          joinedDate: buyer.createdAt,
          lastUpdated: buyer.updatedAt,
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
        summary: {
          totalBuyers: total,
          activeBuyers: formattedBuyers.filter((b) => b.inquiryStats.active > 0)
            .length,
          googleUsers: formattedBuyers.filter((b) => b.isGoogleUser).length,
        },
      };
    } catch (error) {
      console.error("❌ Error in getBuyersWithFilters:", error);
      throw new ApiError(500, `Failed to fetch buyers: ${error.message}`);
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Get human-readable verification status label
   */
  getVerificationStatusLabel(vendor) {
    if (!vendor.verified) {
      return "Pending Verification";
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
      const [vendorTypes, verificationStats, totalVendors] = await Promise.all([
        prisma.vendor.groupBy({
          by: ["vendorType"],
          _count: { vendorType: true },
          where: {
            vendorType: { not: null },
          },
        }),
        prisma.vendor.groupBy({
          by: ["verified", "verificationType"],
          _count: { verified: true },
        }),
        prisma.vendor.count(),
      ]);

      return {
        total: totalVendors,
        vendorTypes: vendorTypes.map((item) => ({
          type: item.vendorType,
          count: item._count.vendorType,
          percentage: Math.round((item._count.vendorType / totalVendors) * 100),
        })),
        verificationStats: verificationStats.map((item) => ({
          verified: item.verified,
          verificationType: item.verificationType,
          count: item._count.verified,
          percentage: Math.round((item._count.verified / totalVendors) * 100),
        })),
      };
    } catch (error) {
      console.error("❌ Error in getVendorFilterStats:", error);
      throw new ApiError(500, "Failed to fetch vendor filter statistics");
    }
  }

  /**
   * Get buyer statistics
   */
  async getBuyerFilterStats() {
    try {
      const [totalBuyers, googleUsers, regularUsers, activeBuyers] =
        await Promise.all([
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
          prisma.user.count({
            where: {
              accountType: "BUYER",
              inquiries: {
                some: {
                  status: "OPEN",
                },
              },
            },
          }),
        ]);

      return {
        total: totalBuyers,
        googleUsers,
        regularUsers,
        activeBuyers,
        statistics: {
          googleUserPercentage:
            totalBuyers > 0 ? Math.round((googleUsers / totalBuyers) * 100) : 0,
          activeBuyerPercentage:
            totalBuyers > 0
              ? Math.round((activeBuyers / totalBuyers) * 100)
              : 0,
        },
      };
    } catch (error) {
      console.error("❌ Error in getBuyerFilterStats:", error);
      throw new ApiError(500, "Failed to fetch buyer filter statistics");
    }
  }
}

module.exports = new AdminService();
