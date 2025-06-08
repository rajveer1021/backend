// src/controllers/admin.controller.js - Simplified dashboard APIs

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
        .json(
          new ApiResponse(200, result, "Core KPIs fetched successfully")
        );
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
      throw new ApiError(500, error.message || "Failed to fetch activity metrics");
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
          new ApiResponse(
            200,
            result,
            "Recent activities fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Error fetching recent activities:", error);
      throw new ApiError(500, error.message || "Failed to fetch recent activities");
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
      throw new ApiError(500, error.message || "Failed to fetch vendor statistics");
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
      throw new ApiError(500, error.message || "Failed to fetch buyer statistics");
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

  // Legacy method for backward compatibility (if needed)
  getDashboardStats = asyncHandler(async (req, res) => {
    const result = await adminService.getDashboardStats();
    res
      .status(200)
      .json(
        new ApiResponse(200, result, "Dashboard stats fetched successfully")
      );
  });
}

module.exports = new AdminController();