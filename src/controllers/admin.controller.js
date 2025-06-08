// src/controllers/admin.controller.js - Updated with rejection handling

const adminService = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const prisma = require("../config/database");

class AdminController {
  // ... (keeping existing vendor/buyer management methods)

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

  verifyVendor = asyncHandler(async (req, res) => {
    const { verified, rejectionReason } = req.body;

    console.log("🔍 Verify vendor request:", {
      vendorId: req.params.vendorId,
      verified,
      rejectionReason: rejectionReason
        ? rejectionReason.substring(0, 50) + "..."
        : null,
    });

    // Validation for rejection reason
    if (verified === false) {
      if (!rejectionReason || rejectionReason.trim() === "") {
        throw new ApiError(
          400,
          "Rejection reason is required when rejecting a vendor"
        );
      }
      if (rejectionReason.trim().length < 10) {
        throw new ApiError(
          400,
          "Rejection reason must be at least 10 characters long"
        );
      }
      if (rejectionReason.length > 500) {
        throw new ApiError(
          400,
          "Rejection reason must be less than 500 characters"
        );
      }
    }

    try {
      const result = await adminService.verifyVendor(
        req.params.vendorId,
        verified,
        rejectionReason?.trim()
      );

      const message = verified
        ? "Vendor verified successfully"
        : `Vendor rejected successfully. Reason: ${rejectionReason?.trim()}`;

      res.status(200).json(new ApiResponse(200, result, message));
    } catch (error) {
      console.error("❌ Verify vendor error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to update vendor verification");
    }
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

  // ===== SIMPLIFIED DASHBOARD APIS =====

  /**
   * API 1: Get Core KPIs (Total Users, Vendors, Products, Inquiries, Platform Health)
   * GET /api/admin/dashboard/core-kpis
   */
  getCoreKPIs = asyncHandler(async (req, res) => {
    console.log("📊 Admin fetching core KPIs");

    try {
      const result = await adminService.getCoreKPIs();

      res
        .status(200)
        .json(new ApiResponse(200, result, "Core KPIs fetched successfully"));
    } catch (error) {
      console.error("❌ Error fetching core KPIs:", error);
      throw new ApiError(500, error.message || "Failed to fetch core KPIs");
    }
  });

  /**
   * API 2: Get Activity Metrics (Pending Verifications, Open Inquiries, Active Products, Verification Rate)
   * GET /api/admin/dashboard/activity-metrics
   */
  getActivityMetrics = asyncHandler(async (req, res) => {
    console.log("📈 Admin fetching activity metrics");

    try {
      const result = await adminService.getActivityMetrics();

      res
        .status(200)
        .json(
          new ApiResponse(200, result, "Activity metrics fetched successfully")
        );
    } catch (error) {
      console.error("❌ Error fetching activity metrics:", error);
      throw new ApiError(
        500,
        error.message || "Failed to fetch activity metrics"
      );
    }
  });

  /**
   * API 3: Get Recent Activities
   * GET /api/admin/dashboard/recent-activities
   */
  getRecentActivities = asyncHandler(async (req, res) => {
    console.log("🔄 Admin fetching recent activities");

    const { limit = 10 } = req.query;

    try {
      const result = await adminService.getRecentActivities(parseInt(limit));

      res
        .status(200)
        .json(
          new ApiResponse(200, result, "Recent activities fetched successfully")
        );
    } catch (error) {
      console.error("❌ Error fetching recent activities:", error);
      throw new ApiError(
        500,
        error.message || "Failed to fetch recent activities"
      );
    }
  });

  // ===== ENHANCED VENDOR MANAGEMENT =====

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
      throw new ApiError(
        500,
        error.message || "Failed to fetch vendor statistics"
      );
    }
  });

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
      throw new ApiError(
        500,
        error.message || "Failed to fetch buyer statistics"
      );
    }
  });

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
            take: 10,
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
          take: 5,
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
        rejectionInfo: {
          isRejected: vendor.verificationStatus === "rejected",
          rejectionReason: vendor.rejectionReason,
          rejectedAt: vendor.rejectedAt,
        },
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
        recentInquiries: buyer.inquiries.slice(0, 10),
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

  // ===== VENDOR REJECTION MANAGEMENT =====

  /**
   * Get vendor rejection details
   * GET /api/admin/vendors/:vendorId/rejection-details
   */
  getVendorRejectionDetails = asyncHandler(async (req, res) => {
    console.log(
      "🔍 Admin fetching vendor rejection details:",
      req.params.vendorId
    );

    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: req.params.vendorId },
        select: {
          id: true,
          verified: true,
          verificationStatus: true,
          rejectionReason: true,
          rejectedAt: true,
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

      if (vendor.verificationStatus !== "rejected") {
        throw new ApiError(400, "Vendor is not in rejected status");
      }

      const rejectionDetails = {
        vendorId: vendor.id,
        vendorName: `${vendor.user.firstName} ${vendor.user.lastName}`.trim(),
        vendorEmail: vendor.user.email,
        isRejected: true,
        rejectionReason: vendor.rejectionReason,
        rejectedAt: vendor.rejectedAt,
        canResubmit: true, // You can add logic here based on business rules
      };

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            rejectionDetails,
            "Vendor rejection details fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Get vendor rejection details error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to fetch vendor rejection details");
    }
  });

  /**
   * Clear vendor rejection and allow resubmission
   * POST /api/admin/vendors/:vendorId/clear-rejection
   */
  clearVendorRejection = asyncHandler(async (req, res) => {
    console.log("🔄 Admin clearing vendor rejection:", req.params.vendorId);

    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: req.params.vendorId },
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

      if (vendor.verificationStatus !== "rejected") {
        throw new ApiError(400, "Vendor is not in rejected status");
      }

      // Clear rejection and set back to pending
      const updatedVendor = await prisma.vendor.update({
        where: { id: req.params.vendorId },
        data: {
          verificationStatus: "pending",
          rejectionReason: null,
          rejectedAt: null,
          verified: false,
          updatedAt: new Date(),
        },
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

      res.status(200).json(
        new ApiResponse(
          200,
          {
            ...updatedVendor,
            verificationStatusLabel:
              adminService.getVerificationStatusLabel(updatedVendor),
          },
          "Vendor rejection cleared successfully. Vendor can now resubmit for verification."
        )
      );
    } catch (error) {
      console.error("❌ Clear vendor rejection error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to clear vendor rejection");
    }
  });

  /**
   * Get rejection statistics
   * GET /api/admin/vendors/rejection-stats
   */
  getRejectionStats = asyncHandler(async (req, res) => {
    console.log("📊 Admin fetching rejection statistics");

    try {
      const [
        totalRejected,
        rejectionsThisMonth,
        rejectionsLastMonth,
        topRejectionReasons,
        recentRejections,
      ] = await Promise.all([
        // Total rejected vendors
        prisma.vendor.count({
          where: {
            verificationStatus: "rejected",
          },
        }),

        // Rejections this month
        prisma.vendor.count({
          where: {
            verificationStatus: "rejected",
            rejectedAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Rejections last month
        prisma.vendor.count({
          where: {
            verificationStatus: "rejected",
            rejectedAt: {
              gte: new Date(
                new Date().getFullYear(),
                new Date().getMonth() - 1,
                1
              ),
              lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // Get rejection reasons (you might want to implement proper categorization)
        prisma.vendor.findMany({
          where: {
            verificationStatus: "rejected",
            rejectionReason: { not: null },
          },
          select: {
            rejectionReason: true,
          },
        }),

        // Recent rejections
        prisma.vendor.findMany({
          where: {
            verificationStatus: "rejected",
          },
          select: {
            id: true,
            rejectionReason: true,
            rejectedAt: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            rejectedAt: "desc",
          },
          take: 10,
        }),
      ]);

      // Process rejection reasons to find common patterns
      const reasonFrequency = {};
      topRejectionReasons.forEach((vendor) => {
        const reason = vendor.rejectionReason?.toLowerCase().trim();
        if (reason) {
          // Simple keyword extraction - you can make this more sophisticated
          const keywords = reason.split(" ").filter((word) => word.length > 3);
          keywords.forEach((keyword) => {
            reasonFrequency[keyword] = (reasonFrequency[keyword] || 0) + 1;
          });
        }
      });

      const topReasons = Object.entries(reasonFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([reason, count]) => ({ reason, count }));

      const rejectionGrowth =
        rejectionsLastMonth > 0
          ? Math.round(
              ((rejectionsThisMonth - rejectionsLastMonth) /
                rejectionsLastMonth) *
                100
            )
          : rejectionsThisMonth > 0
          ? 100
          : 0;

      const stats = {
        totalRejected,
        rejectionsThisMonth,
        rejectionsLastMonth,
        rejectionGrowth,
        topRejectionReasons: topReasons,
        recentRejections: recentRejections.map((vendor) => ({
          id: vendor.id,
          vendorName: `${vendor.user.firstName} ${vendor.user.lastName}`.trim(),
          vendorEmail: vendor.user.email,
          rejectionReason: vendor.rejectionReason,
          rejectedAt: vendor.rejectedAt,
        })),
        generatedAt: new Date().toISOString(),
      };

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            stats,
            "Rejection statistics fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Error fetching rejection stats:", error);
      throw new ApiError(
        500,
        error.message || "Failed to fetch rejection statistics"
      );
    }
  });

  // Legacy method for backward compatibility (if needed)
  getDashboardStats = asyncHandler(async (req, res) => {
    const result = await adminService.getDashboardStats();
    res
      .status(200)
      .json(
        new ApiResponse(200, result, "Dashboard stats fetched successfully")
      );
  });

  /**
   * Toggle user activation status (activate/deactivate)
   * PUT /api/admin/users/:userId/toggle-status
   */
  toggleUserStatus = asyncHandler(async (req, res) => {
    console.log("🔄 Admin toggling user status:", req.params.userId);

    try {
      const { userId } = req.params;
      const { isActive, reason } = req.body;

      // Validate input
      if (typeof isActive !== "boolean") {
        throw new ApiError(
          400,
          "isActive field is required and must be a boolean"
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Prevent deactivating admin users
      if (user.accountType === "ADMIN" && !isActive) {
        throw new ApiError(400, "Cannot deactivate admin users");
      }

      // Update user status
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

      const action = isActive ? "activated" : "deactivated";
      const userType = user.accountType.toLowerCase();

      console.log(`✅ User ${action} successfully`);

      res.status(200).json(
        new ApiResponse(
          200,
          {
            user: {
              id: updatedUser.id,
              firstName: updatedUser.firstName,
              lastName: updatedUser.lastName,
              email: updatedUser.email,
              accountType: updatedUser.accountType,
              isActive: updatedUser.isActive,
              vendor: updatedUser.vendor,
              updatedAt: updatedUser.updatedAt,
            },
            action,
            reason: reason || null,
          },
          `${userType} ${action} successfully`
        )
      );
    } catch (error) {
      console.error("❌ Toggle user status error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to toggle user status");
    }
  });

  getUserActivationStats = asyncHandler(async (req, res) => {
    console.log("📊 Admin fetching user activation statistics");

    try {
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        activeBuyers,
        inactiveBuyers,
        activeVendors,
        inactiveVendors,
        recentDeactivations,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({
          where: {
            accountType: "BUYER",
            isActive: true,
          },
        }),
        prisma.user.count({
          where: {
            accountType: "BUYER",
            isActive: false,
          },
        }),
        prisma.user.count({
          where: {
            accountType: "VENDOR",
            isActive: true,
          },
        }),
        prisma.user.count({
          where: {
            accountType: "VENDOR",
            isActive: false,
          },
        }),
        prisma.user.findMany({
          where: {
            isActive: false,
            updatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountType: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        }),
      ]);

      const stats = {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        activationRate:
          totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        byAccountType: {
          buyers: {
            active: activeBuyers,
            inactive: inactiveBuyers,
            total: activeBuyers + inactiveBuyers,
            activationRate:
              activeBuyers + inactiveBuyers > 0
                ? Math.round(
                    (activeBuyers / (activeBuyers + inactiveBuyers)) * 100
                  )
                : 0,
          },
          vendors: {
            active: activeVendors,
            inactive: inactiveVendors,
            total: activeVendors + inactiveVendors,
            activationRate:
              activeVendors + inactiveVendors > 0
                ? Math.round(
                    (activeVendors / (activeVendors + inactiveVendors)) * 100
                  )
                : 0,
          },
        },
        recentDeactivations: recentDeactivations.map((user) => ({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accountType: user.accountType,
          deactivatedAt: user.updatedAt,
        })),
        generatedAt: new Date().toISOString(),
      };

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            stats,
            "User activation statistics fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Error fetching user activation stats:", error);
      throw new ApiError(500, "Failed to fetch user activation statistics");
    }
  });
}

module.exports = new AdminController();
