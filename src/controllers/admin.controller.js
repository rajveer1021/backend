const adminService = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const prisma = require("../config/database");

class AdminController {
  getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, accountType } = req.query;
    const result = await adminService.getAllUsers(
      parseInt(page),
      parseInt(limit),
      accountType
    );
    res
      .status(200)
      .json(new ApiResponse(200, result, "Users fetched successfully"));
  });

  /**
   * 5. API to list all vendor profiles which are submitted ✅
   */
  getVendorSubmissions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, verified } = req.query;
    const result = await adminService.getVendorSubmissions(
      parseInt(page),
      parseInt(limit),
      verified
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, result, "Vendor submissions fetched successfully")
      );
  });

  /**
   * 6. API to verify the vendor business profile ✅
   */
  verifyVendor = asyncHandler(async (req, res) => {
    const { verified } = req.body;
    const result = await adminService.verifyVendor(
      req.params.vendorId,
      verified
    );
    res
      .status(200)
      .json(
        new ApiResponse(200, result, "Vendor verification updated successfully")
      );
  });

  getAllProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await adminService.getAllProducts(
      parseInt(page),
      parseInt(limit)
    );
    res
      .status(200)
      .json(new ApiResponse(200, result, "Products fetched successfully"));
  });

  getDashboardStats = asyncHandler(async (req, res) => {
    const result = await adminService.getDashboardStats();
    res
      .status(200)
      .json(
        new ApiResponse(200, result, "Dashboard stats fetched successfully")
      );
  });

  // ===== ENHANCED VENDOR MANAGEMENT =====

  /**
   * 1. API to list all vendors on the platform ✅
   * 2. API to search and filter vendors by name, email, vendor type, verification status ✅
   * GET /api/admin/vendors - Get vendors with advanced search and filtering
   */
  getVendors = asyncHandler(async (req, res) => {
    console.log("📋 Admin fetching vendors with filters:", req.query);

    const {
      page = 1,
      limit = 10,
      search = "",
      vendorType = "",
      verificationStatus = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search.trim(),
      vendorType,
      verificationStatus,
      sortBy,
      sortOrder,
    };

    try {
      const result = await adminService.getVendorsWithFilters(params);

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            `Vendors fetched successfully. Found ${result.vendors.length} vendors out of ${result.pagination.total} total.`
          )
        );
    } catch (error) {
      console.error("❌ Error fetching vendors:", error);
      throw new ApiError(500, error.message || "Failed to fetch vendors");
    }
  });

  /**
   * GET /api/admin/vendors/stats - Get vendor filter statistics
   */
  getVendorStats = asyncHandler(async (req, res) => {
    console.log("📊 Admin fetching vendor statistics");

    try {
      const result = await adminService.getVendorFilterStats();

      res
        .status(200)
        .json(
          new ApiResponse(200, result, "Vendor statistics fetched successfully")
        );
    } catch (error) {
      console.error("❌ Error fetching vendor stats:", error);
      throw new ApiError(500, error.message || "Failed to fetch vendor statistics");
    }
  });

  // ===== BUYER MANAGEMENT =====

  /**
   * 3. API to list buyers on the platform ✅
   * 4. API to search and filter buyers by name, email ✅
   * GET /api/admin/buyers - Get buyers with search and filtering
   */
  getBuyers = asyncHandler(async (req, res) => {
    console.log("👥 Admin fetching buyers with filters:", req.query);

    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search.trim(),
      sortBy,
      sortOrder,
    };

    try {
      const result = await adminService.getBuyersWithFilters(params);

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            `Buyers fetched successfully. Found ${result.buyers.length} buyers out of ${result.pagination.total} total.`
          )
        );
    } catch (error) {
      console.error("❌ Error fetching buyers:", error);
      throw new ApiError(500, error.message || "Failed to fetch buyers");
    }
  });

  /**
   * GET /api/admin/buyers/stats - Get buyer filter statistics
   */
  getBuyerStats = asyncHandler(async (req, res) => {
    console.log("📊 Admin fetching buyer statistics");

    try {
      const result = await adminService.getBuyerFilterStats();

      res
        .status(200)
        .json(
          new ApiResponse(200, result, "Buyer statistics fetched successfully")
        );
    } catch (error) {
      console.error("❌ Error fetching buyer stats:", error);
      throw new ApiError(500, error.message || "Failed to fetch buyer statistics");
    }
  });

  /**
   * GET /api/admin/vendors/:vendorId - Get single vendor details
   */
  getVendorDetails = asyncHandler(async (req, res) => {
    console.log("🔍 Admin fetching vendor details:", req.params.vendorId);

    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: req.params.vendorId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              accountType: true,
              googleId: true,
              createdAt: true,
            },
          },
          products: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              price: true,
              category: true,
              stock: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 10, // Latest 10 products
          },
          _count: {
            select: {
              products: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      if (!vendor) {
        throw new ApiError(404, "Vendor not found");
      }

      // Get additional statistics
      const [totalInquiries, recentInquiries] = await Promise.all([
        prisma.inquiry.count({
          where: {
            product: {
              vendorId: vendor.id,
              isActive: true,
            },
          },
        }),
        prisma.inquiry.findMany({
          where: {
            product: {
              vendorId: vendor.id,
              isActive: true,
            },
          },
          select: {
            id: true,
            message: true,
            status: true,
            createdAt: true,
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
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5, // Latest 5 inquiries
        }),
      ]);

      const vendorDetails = {
        ...vendor,
        verificationStatus: adminService.getVerificationStatusLabel(vendor),
        fullAddress: [
          vendor.businessAddress1,
          vendor.businessAddress2,
          vendor.city,
          vendor.state,
          vendor.postalCode,
        ]
          .filter(Boolean)
          .join(", "),
        statistics: {
          totalProducts: vendor._count.products,
          totalInquiries,
          activeProducts: vendor.products.filter((p) => p.stock > 0).length,
          outOfStockProducts: vendor.products.filter((p) => p.stock === 0)
            .length,
        },
        recentInquiries,
      };

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            vendorDetails,
            "Vendor details fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Get vendor details error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch vendor details");
    }
  });

  /**
   * GET /api/admin/buyers/:buyerId - Get single buyer details
   */
  getBuyerDetails = asyncHandler(async (req, res) => {
    console.log("🔍 Admin fetching buyer details:", req.params.buyerId);

    try {
      const buyer = await prisma.user.findFirst({
        where: {
          id: req.params.buyerId,
          accountType: "BUYER",
        },
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
              message: true,
              status: true,
              vendorResponse: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  vendor: {
                    select: {
                      businessName: true,
                      user: {
                        select: {
                          firstName: true,
                          lastName: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              inquiries: true,
            },
          },
        },
      });

      if (!buyer) {
        throw new ApiError(404, "Buyer not found");
      }

      const inquiryStats = {
        total: buyer._count.inquiries,
        open: buyer.inquiries.filter((i) => i.status === "OPEN").length,
        responded: buyer.inquiries.filter((i) => i.status === "RESPONDED")
          .length,
        closed: buyer.inquiries.filter((i) => i.status === "CLOSED").length,
      };

      const buyerDetails = {
        ...buyer,
        fullName: `${buyer.firstName} ${buyer.lastName}`.trim(),
        isGoogleUser: !!buyer.googleId,
        inquiryStats,
        recentInquiries: buyer.inquiries.slice(0, 10), // Latest 10 inquiries
      };

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            buyerDetails,
            "Buyer details fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Get buyer details error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch buyer details");
    }
  });

  /**
   * GET /api/admin/dashboard/kpis - Get comprehensive dashboard KPIs
   */
  getDashboardKPIs = asyncHandler(async (req, res) => {
    console.log("📊 Admin fetching comprehensive dashboard KPIs");

    try {
      const result = await adminService.getDashboardKPIs();

      res
        .status(200)
        .json(
          new ApiResponse(200, result, "Dashboard KPIs fetched successfully")
        );
    } catch (error) {
      console.error("❌ Get dashboard KPIs error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch dashboard KPIs");
    }
  });

  /**
   * GET /api/admin/dashboard/activities - Get recent activities
   */
  getRecentActivities = asyncHandler(async (req, res) => {
    console.log("🔄 Admin fetching recent activities");

    try {
      const activities = await adminService.getRecentActivities();

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { activities },
            "Recent activities fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Get recent activities error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch recent activities");
    }
  });

  /**
   * GET /api/admin/dashboard/daily-stats - Get daily statistics for charts
   */
  getDailyStats = asyncHandler(async (req, res) => {
    console.log("📈 Admin fetching daily statistics");

    const { days = 30 } = req.query;

    try {
      const result = await adminService.getDailyStats(parseInt(days));

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { dailyStats: result, period: `${days} days` },
            "Daily statistics fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Get daily stats error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch daily statistics");
    }
  });

  /**
   * GET /api/admin/dashboard/summary - Get quick dashboard summary
   */
  getDashboardSummary = asyncHandler(async (req, res) => {
    console.log("📋 Admin fetching dashboard summary");

    try {
      const kpis = await adminService.getDashboardKPIs();

      // Extract key metrics for quick summary
      const summary = {
        totalUsers: kpis.coreStats.totalUsers.value,
        totalVendors: kpis.coreStats.totalVendors.value,
        totalProducts: kpis.coreStats.totalProducts.value,
        totalInquiries: kpis.coreStats.totalInquiries.value,
        pendingVerifications: kpis.verificationMetrics.pending,
        openInquiries: kpis.activityMetrics.openInquiries,

        // Growth indicators
        userGrowth: kpis.coreStats.totalUsers.growth,
        vendorGrowth: kpis.coreStats.totalVendors.growth,
        productGrowth: kpis.coreStats.totalProducts.growth,

        // Health indicators
        verificationRate: kpis.verificationMetrics.verificationRate,
        responseRate: kpis.coreStats.totalInquiries.responseRate,

        // Recent activity counts
        recentActivity: {
          usersThisWeek: kpis.coreStats.totalUsers.weeklyGrowth,
          vendorsThisWeek: kpis.coreStats.totalVendors.weeklyGrowth,
          productsThisWeek: kpis.coreStats.totalProducts.weeklyGrowth,
          inquiriesThisWeek: kpis.coreStats.totalInquiries.weeklyGrowth,
        },

        // Platform health
        platformHealth: kpis.insights.platformHealth,

        // Top metrics
        topCategory: kpis.insights.mostActiveCategory,
        topVendorType: kpis.insights.mostCommonVendorType,

        generatedAt: kpis.generatedAt,
      };

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            summary,
            "Dashboard summary fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Get dashboard summary error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch dashboard summary");
    }
  });

  /**
   * GET /api/admin/dashboard/alerts - Get system alerts and notifications
   */
  getDashboardAlerts = asyncHandler(async (req, res) => {
    console.log("🚨 Admin fetching dashboard alerts");

    try {
      const kpis = await adminService.getDashboardKPIs();
      const alerts = [];

      // Check for pending verifications
      if (kpis.verificationMetrics.pending > 5) {
        alerts.push({
          id: "pending_verifications",
          type: "warning",
          title: "Pending Vendor Verifications",
          message: `${kpis.verificationMetrics.pending} vendors are waiting for verification`,
          action: "Review Vendors",
          actionUrl: "/admin/vendors?verificationStatus=pending",
          priority: "high",
        });
      }

      // Check for low verification rate
      if (
        kpis.verificationMetrics.verificationRate < 50 &&
        kpis.coreStats.totalVendors.value > 10
      ) {
        alerts.push({
          id: "low_verification_rate",
          type: "error",
          title: "Low Verification Rate",
          message: `Only ${kpis.verificationMetrics.verificationRate}% of vendors are verified`,
          action: "Review Process",
          priority: "high",
        });
      }

      // Check for high number of open inquiries
      if (kpis.activityMetrics.openInquiries > 20) {
        alerts.push({
          id: "high_open_inquiries",
          type: "warning",
          title: "High Number of Open Inquiries",
          message: `${kpis.activityMetrics.openInquiries} inquiries need attention`,
          action: "View Inquiries",
          priority: "medium",
        });
      }

      // Check for negative growth
      if (kpis.growthTrends.users.growth < -10) {
        alerts.push({
          id: "negative_user_growth",
          type: "error",
          title: "Declining User Growth",
          message: `User registrations dropped by ${Math.abs(
            kpis.growthTrends.users.growth
          )}% this month`,
          action: "Analyze Trends",
          priority: "high",
        });
      }

      // Check for low activity
      if (kpis.coreStats.totalInquiries.weeklyGrowth === 0) {
        alerts.push({
          id: "low_activity",
          type: "info",
          title: "Low Platform Activity",
          message: "No new inquiries this week",
          action: "Check Engagement",
          priority: "low",
        });
      }

      // Check for stock issues
      if (
        kpis.activityMetrics.outOfStockProducts >
        kpis.activityMetrics.activeProducts * 0.3
      ) {
        alerts.push({
          id: "stock_issues",
          type: "warning",
          title: "Stock Management Issues",
          message: `${kpis.activityMetrics.outOfStockProducts} products are out of stock`,
          action: "Notify Vendors",
          priority: "medium",
        });
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { alerts, alertCount: alerts.length },
            "Dashboard alerts fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Get dashboard alerts error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch dashboard alerts");
    }
  });
}

module.exports = new AdminController();