// src/services/admin.service.js - Updated with rejection handling

const prisma = require("../config/database");
const ApiError = require("../utils/ApiError");

class AdminService {
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
              verificationStatus: true,
              rejectionReason: true,
              rejectedAt: true,
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

  async getVendorSubmissions(page = 1, limit = 10, verified) {
    const skip = (page - 1) * limit;

    const where = {
      profileStep: 3,
      verificationType: 'manual' // Only vendors who completed all steps
    };

    // Enhanced filtering by verification status
    if (verified !== undefined) {
      if (verified === "true") {
        where.verified = true;
        where.verificationStatus = "verified";
      } else if (verified === "false") {
        where.verified = false;
        where.OR = [
          { verificationStatus: null },
          { verificationStatus: "pending" },
        ];
      } else if (verified === "rejected") {
        where.verified = false;
        where.verificationStatus = "rejected";
      } else if (verified === "pending") {
        where.verified = false;
        where.OR = [
          { verificationStatus: null },
          { verificationStatus: "pending" },
        ];
        where.rejectionReason = null;
      }
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

  async verifyVendor(vendorId, verified, rejectionReason = null) {
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

    // Prepare update data with enhanced verification status handling
    const updateData = {
      verified,
      updatedAt: new Date(),
    };

    // Handle verification approval
    if (verified) {
      updateData.verificationStatus = "verified";
      updateData.rejectionReason = null; // Clear any previous rejection reason
      updateData.rejectedAt = null; // Clear rejection timestamp
    } else {
      // Handle rejection
      updateData.verificationStatus = "rejected";
      updateData.rejectionReason = rejectionReason || "No reason provided";
      updateData.rejectedAt = new Date();
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
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
      verificationStatusLabel: this.getVerificationStatusLabel(updatedVendor),
      message: `Vendor ${verified ? "verified" : "rejected"} successfully`,
    };
  }

  async getAllProducts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        where: { isActive: true },
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

  // ===== SIMPLIFIED DASHBOARD METHODS =====

  /**
   * Get Core KPIs (Total Users, Vendors, Products, Inquiries, Platform Health)
   */
  async getCoreKPIs() {
    try {
      console.log("📊 Fetching core KPIs...");

      // Get current date ranges for growth calculations
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      const [
        // Current totals
        totalUsers,
        totalVendors,
        totalProducts,
        totalInquiries,

        // Growth data (this month vs last month)
        usersThisMonth,
        usersLastMonth,
        vendorsThisMonth,
        vendorsLastMonth,
        productsThisMonth,
        productsLastMonth,
        inquiriesThisMonth,
        inquiriesLastMonth,

        // Additional metrics with new verification statuses
        verifiedVendors,
        rejectedVendors,
        pendingVendors,
        activeProducts,
        inquiriesResponseRate,
      ] = await Promise.all([
        // Current totals
        prisma.user.count(),
        prisma.vendor.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.inquiry.count(),

        // Growth metrics
        prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.user.count({
          where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        }),
        prisma.vendor.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.vendor.count({
          where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        }),
        prisma.product.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.product.count({
          where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        }),
        prisma.inquiry.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.inquiry.count({
          where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        }),

        // Enhanced verification metrics
        prisma.vendor.count({
          where: {
            verified: true,
            verificationStatus: "verified",
          },
        }),
        prisma.vendor.count({
          where: {
            verified: false,
            verificationStatus: "rejected",
          },
        }),
        prisma.vendor.count({
          where: {
            verified: false,
            OR: [
              { verificationStatus: null },
              { verificationStatus: "pending" },
            ],
          },
        }),
        prisma.product.count({ where: { isActive: true, stock: { gt: 0 } } }),
        prisma.inquiry.count({
          where: {
            OR: [{ status: "RESPONDED" }, { status: "CLOSED" }],
          },
        }),
      ]);

      // Calculate growth percentages
      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Calculate platform health with enhanced verification metrics
      const verificationRate =
        totalVendors > 0
          ? Math.round((verifiedVendors / totalVendors) * 100)
          : 0;
      const productAvailabilityRate =
        totalProducts > 0
          ? Math.round((activeProducts / totalProducts) * 100)
          : 0;
      const responseRate =
        totalInquiries > 0
          ? Math.round((inquiriesResponseRate / totalInquiries) * 100)
          : 0;

      // Determine platform health status
      let platformHealth = "Good";
      if (
        verificationRate > 80 &&
        productAvailabilityRate > 90 &&
        responseRate > 75
      ) {
        platformHealth = "Excellent";
      } else if (
        verificationRate < 50 ||
        productAvailabilityRate < 70 ||
        responseRate < 50
      ) {
        platformHealth = "Needs Attention";
      }

      return {
        totalUsers: {
          value: totalUsers,
          growth: calculateGrowth(usersThisMonth, usersLastMonth),
          thisMonth: usersThisMonth,
          lastMonth: usersLastMonth,
        },
        totalVendors: {
          value: totalVendors,
          growth: calculateGrowth(vendorsThisMonth, vendorsLastMonth),
          thisMonth: vendorsThisMonth,
          lastMonth: vendorsLastMonth,
          verificationRate,
          verified: verifiedVendors,
          rejected: rejectedVendors,
          pending: pendingVendors,
        },
        totalProducts: {
          value: totalProducts,
          growth: calculateGrowth(productsThisMonth, productsLastMonth),
          thisMonth: productsThisMonth,
          lastMonth: productsLastMonth,
          availabilityRate: productAvailabilityRate,
        },
        totalInquiries: {
          value: totalInquiries,
          growth: calculateGrowth(inquiriesThisMonth, inquiriesLastMonth),
          thisMonth: inquiriesThisMonth,
          lastMonth: inquiriesLastMonth,
          responseRate,
        },
        platformHealth: {
          status: platformHealth,
          verificationRate,
          availabilityRate: productAvailabilityRate,
          responseRate,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error in getCoreKPIs:", error);
      throw new ApiError(500, `Failed to fetch core KPIs: ${error.message}`);
    }
  }

  /**
   * Get Activity Metrics with enhanced verification status tracking
   */
  async getActivityMetrics() {
    try {
      console.log("📈 Fetching activity metrics...");

      const [
        pendingVerifications,
        rejectedVendors,
        openInquiries,
        activeProducts,
        outOfStockProducts,
        totalVendors,
        verifiedVendors,
        totalInquiries,
        respondedInquiries,
        closedInquiries,
      ] = await Promise.all([
        prisma.vendor.count({
          where: {
            verified: false,
            OR: [
              { verificationStatus: null },
              { verificationStatus: "pending" },
            ],
          },
        }),
        prisma.vendor.count({
          where: {
            verified: false,
            verificationStatus: "rejected",
          },
        }),
        prisma.inquiry.count({ where: { status: "OPEN" } }),
        prisma.product.count({ where: { isActive: true, stock: { gt: 0 } } }),
        prisma.product.count({ where: { isActive: true, stock: 0 } }),
        prisma.vendor.count(),
        prisma.vendor.count({
          where: {
            verified: true,
            verificationStatus: "verified",
          },
        }),
        prisma.inquiry.count(),
        prisma.inquiry.count({ where: { status: "RESPONDED" } }),
        prisma.inquiry.count({ where: { status: "CLOSED" } }),
      ]);

      const verificationRate =
        totalVendors > 0
          ? Math.round((verifiedVendors / totalVendors) * 100)
          : 0;
      const inquiryResponseRate =
        totalInquiries > 0
          ? Math.round(
              ((respondedInquiries + closedInquiries) / totalInquiries) * 100
            )
          : 0;

      return {
        pendingVerifications: {
          value: pendingVerifications,
          priority:
            pendingVerifications > 10
              ? "high"
              : pendingVerifications > 5
              ? "medium"
              : "low",
        },
        rejectedVendors: {
          value: rejectedVendors,
          priority:
            rejectedVendors > 5
              ? "high"
              : rejectedVendors > 2
              ? "medium"
              : "low",
        },
        openInquiries: {
          value: openInquiries,
          priority:
            openInquiries > 20 ? "high" : openInquiries > 10 ? "medium" : "low",
        },
        activeProducts: {
          value: activeProducts,
          outOfStock: outOfStockProducts,
          total: activeProducts + outOfStockProducts,
        },
        verificationRate: {
          value: verificationRate,
          verified: verifiedVendors,
          pending: pendingVerifications,
          rejected: rejectedVendors,
          total: totalVendors,
        },
        inquiryMetrics: {
          responseRate: inquiryResponseRate,
          total: totalInquiries,
          open: openInquiries,
          responded: respondedInquiries,
          closed: closedInquiries,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error in getActivityMetrics:", error);
      throw new ApiError(
        500,
        `Failed to fetch activity metrics: ${error.message}`
      );
    }
  }

  /**
   * Get Recent Activities with enhanced verification events
   */
  async getRecentActivities(limit = 10) {
    try {
      console.log(`🔄 Fetching recent activities (limit: ${limit})...`);

      const [
        recentUsers,
        recentVendors,
        recentProducts,
        recentInquiries,
        recentVerifications,
        recentRejections,
      ] = await Promise.all([
        // Recent user registrations
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: Math.ceil(limit / 6),
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountType: true,
            createdAt: true,
          },
        }),

        // Recent vendor registrations
        prisma.vendor.findMany({
          orderBy: { createdAt: "desc" },
          take: Math.ceil(limit / 6),
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

        // Recent products
        prisma.product.findMany({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: Math.ceil(limit / 6),
          include: {
            vendor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        }),

        // Recent inquiries
        prisma.inquiry.findMany({
          orderBy: { createdAt: "desc" },
          take: Math.ceil(limit / 6),
          include: {
            buyer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            product: {
              select: {
                name: true,
                vendor: {
                  select: {
                    businessName: true,
                  },
                },
              },
            },
          },
        }),

        // Recent verifications (updated in last 7 days)
        prisma.vendor.findMany({
          where: {
            verified: true,
            verificationStatus: "verified",
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { updatedAt: "desc" },
          take: Math.ceil(limit / 6),
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        }),

        // Recent rejections (updated in last 7 days)
        prisma.vendor.findMany({
          where: {
            verified: false,
            verificationStatus: "rejected",
            rejectedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { rejectedAt: "desc" },
          take: Math.ceil(limit / 6),
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

      const activities = [];

      // Add user registrations
      recentUsers.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: "user_registration",
          title: "New User Registration",
          description: `${user.firstName} ${user.lastName} (${user.accountType}) joined the platform`,
          timestamp: user.createdAt,
          icon: "user-plus",
          priority: user.accountType === "VENDOR" ? "high" : "medium",
        });
      });

      // Add vendor registrations
      recentVendors.forEach((vendor) => {
        activities.push({
          id: `vendor-${vendor.id}`,
          type: "vendor_registration",
          title: "New Vendor Registration",
          description: `${vendor.user.firstName} ${
            vendor.user.lastName
          } registered as ${vendor.vendorType || "vendor"}`,
          timestamp: vendor.createdAt,
          icon: "building",
          priority: "high",
        });
      });

      // Add product listings
      recentProducts.forEach((product) => {
        activities.push({
          id: `product-${product.id}`,
          type: "product_listed",
          title: "New Product Listed",
          description: `${product.name} by ${
            product.vendor.businessName ||
            `${product.vendor.user.firstName} ${product.vendor.user.lastName}`
          }`,
          timestamp: product.createdAt,
          icon: "package",
          priority: "medium",
        });
      });

      // Add inquiries
      recentInquiries.forEach((inquiry) => {
        activities.push({
          id: `inquiry-${inquiry.id}`,
          type: "inquiry_received",
          title: "New Inquiry",
          description: `${inquiry.buyer.firstName} ${inquiry.buyer.lastName} inquired about ${inquiry.product.name}`,
          timestamp: inquiry.createdAt,
          icon: "message-square",
          priority: "medium",
        });
      });

      // Add verifications
      recentVerifications.forEach((vendor) => {
        activities.push({
          id: `verification-${vendor.id}`,
          type: "vendor_verified",
          title: "Vendor Verified",
          description: `${vendor.user.firstName} ${vendor.user.lastName} has been verified`,
          timestamp: vendor.updatedAt,
          icon: "check-circle",
          priority: "high",
        });
      });

      // Add rejections
      recentRejections.forEach((vendor) => {
        activities.push({
          id: `rejection-${vendor.id}`,
          type: "vendor_rejected",
          title: "Vendor Rejected",
          description: `${vendor.user.firstName} ${vendor.user.lastName} verification was rejected`,
          timestamp: vendor.rejectedAt,
          icon: "x-circle",
          priority: "high",
        });
      });

      // Sort by timestamp and return top activities
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return {
        activities: sortedActivities,
        total: sortedActivities.length,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error in getRecentActivities:", error);
      throw new ApiError(
        500,
        `Failed to fetch recent activities: ${error.message}`
      );
    }
  }

  // ===== VENDOR MANAGEMENT METHODS =====

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

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
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

    // Enhanced verification status filter
    if (
      verificationStatus &&
      verificationStatus !== "all" &&
      verificationStatus !== ""
    ) {
      switch (verificationStatus) {
        case "gst_verified":
          where.AND = [
            { verified: true },
            { verificationType: "gst" },
            { verificationStatus: "verified" },
          ];
          break;
        case "manually_verified":
          where.AND = [
            { verified: true },
            { verificationType: "manual" },
            { verificationStatus: "verified" },
          ];
          break;
        case "pending":
          where.verified = false;
          where.OR = [
            { verificationStatus: null },
            { verificationStatus: "pending" },
          ];
          break;
        case "verified":
          where.verified = true;
          where.verificationStatus = "verified";
          break;
        case "rejected":
          where.verified = false;
          where.verificationStatus = "rejected";
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
      case "verificationStatus":
        orderBy = { verificationStatus: sortOrder.toLowerCase() };
        break;
      case "rejectedAt":
        orderBy = { rejectedAt: sortOrder.toLowerCase() };
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

      // Format the response with enhanced rejection information
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
        verificationStatus: vendor.verificationStatus,
        verificationStatusLabel: this.getVerificationStatusLabel(vendor),
        rejectionInfo: {
          isRejected: vendor.verificationStatus === "rejected",
          rejectionReason: vendor.rejectionReason,
          rejectedAt: vendor.rejectedAt,
        },
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
          pendingVendors: formattedVendors.filter(
            (v) => !v.verified && v.verificationStatus !== "rejected"
          ).length,
          rejectedVendors: formattedVendors.filter(
            (v) => v.verificationStatus === "rejected"
          ).length,
        },
      };
    } catch (error) {
      console.error("❌ Error in getVendorsWithFilters:", error);
      throw new ApiError(500, `Failed to fetch vendors: ${error.message}`);
    }
  }

  async getBuyersWithFilters(params) {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * limit;

    const where = {
      accountType: "BUYER",
    };

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
              take: 5,
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

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

  getVerificationStatusLabel(vendor) {
    if (vendor.verified && vendor.verificationStatus === "verified") {
      if (vendor.verificationType === "gst") {
        return "GST Verified";
      } else if (vendor.verificationType === "manual") {
        return "Manually Verified";
      }
      return "Verified";
    } else if (vendor.verificationStatus === "rejected") {
      return "Rejected";
    } else if (vendor.verificationStatus === "pending") {
      return "Pending Verification";
    } else if (!vendor.verified && !vendor.verificationStatus) {
      return "Pending Verification";
    } else {
      return "Unknown Status";
    }
  }

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
          by: ["verified", "verificationType", "verificationStatus"],
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
          verificationStatus: item.verificationStatus,
          count: item._count.verified,
          percentage: Math.round((item._count.verified / totalVendors) * 100),
        })),
      };
    } catch (error) {
      console.error("❌ Error in getVendorFilterStats:", error);
      throw new ApiError(500, "Failed to fetch vendor filter statistics");
    }
  }

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

  // Legacy method for backward compatibility
  async getDashboardStats() {
    try {
      const [
        totalUsers,
        totalVendors,
        totalProducts,
        totalInquiries,
        verifiedVendors,
        pendingVendors,
        rejectedVendors,
        totalBuyers,
        googleUsers,
        activeProducts,
        openInquiries,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.vendor.count(),
        prisma.product.count({ where: { isActive: true } }),
        prisma.inquiry.count(),
        prisma.vendor.count({
          where: {
            verified: true,
            verificationStatus: "verified",
          },
        }),
        prisma.vendor.count({
          where: {
            verified: false,
            OR: [
              { verificationStatus: null },
              { verificationStatus: "pending" },
            ],
          },
        }),
        prisma.vendor.count({
          where: {
            verified: false,
            verificationStatus: "rejected",
          },
        }),
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
        rejectedVendors,
        googleUsers,
        activeProducts,
        openInquiries,
        stats: {
          vendorVerificationRate:
            totalVendors > 0
              ? Math.round((verifiedVendors / totalVendors) * 100)
              : 0,
        },
      };
    } catch (error) {
      console.error("❌ Error in getDashboardStats:", error);
      throw new ApiError(500, "Failed to fetch dashboard stats");
    }
  }

  async toggleUserStatus(userId, isActive, reason = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          vendor: true,
        },
      });

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Prevent deactivating admin users
      if (user.accountType === "ADMIN" && !isActive) {
        throw new ApiError(400, "Cannot deactivate admin users");
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive,
          updatedAt: new Date(),
        },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
              verified: true,
            },
          },
        },
      });

      return {
        user: updatedUser,
        action: isActive ? "activated" : "deactivated",
        reason,
      };
    } catch (error) {
      console.error("❌ Toggle user status service error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to toggle user status");
    }
  }

  /**
   * Get user activation statistics
   */
  async getUserActivationStats() {
    try {
      const [totalUsers, activeUsers, inactiveUsers, usersByType] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { isActive: true } }),
          prisma.user.count({ where: { isActive: false } }),
          prisma.user.groupBy({
            by: ["accountType", "isActive"],
            _count: {
              id: true,
            },
          }),
        ]);

      // Process user stats by account type
      const statsByType = {};
      usersByType.forEach((stat) => {
        if (!statsByType[stat.accountType]) {
          statsByType[stat.accountType] = { active: 0, inactive: 0 };
        }
        statsByType[stat.accountType][stat.isActive ? "active" : "inactive"] =
          stat._count.id;
      });

      return {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        activationRate:
          totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        byAccountType: statsByType,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Get user activation stats service error:", error);
      throw new ApiError(500, "Failed to fetch user activation statistics");
    }
  }
}

module.exports = new AdminService();