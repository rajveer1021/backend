// src/controllers/admin.controller.js - Complete file with all methods

const adminService = require("../services/admin.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const prisma = require("../config/database");

class AdminController {
  // ===== USER MANAGEMENT =====

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

      const result = await adminService.toggleUserStatus(userId, isActive, reason);

      const action = isActive ? "activated" : "deactivated";
      const userType = result.user.accountType.toLowerCase();

      console.log(`✅ User ${action} successfully`);

      res.status(200).json(
        new ApiResponse(
          200,
          {
            user: {
              id: result.user.id,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              email: result.user.email,
              accountType: result.user.accountType,
              isActive: result.user.isActive,
              vendor: result.user.vendor,
              updatedAt: result.user.updatedAt,
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
      const result = await adminService.getUserActivationStats();

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "User activation statistics fetched successfully"
          )
        );
    } catch (error) {
      console.error("❌ Error fetching user activation stats:", error);
      throw new ApiError(500, "Failed to fetch user activation statistics");
    }
  });

  // ===== VENDOR MANAGEMENT =====

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

  /**
   * Get all vendors with filtering and pagination
   * GET /api/admin/vendors
   */
  getVendors = asyncHandler(async (req, res) => {
    console.log("📋 Admin fetching vendors with filters:", req.query);

    const {
      page = 1,
      limit = 10,
      search = "",
      vendorType = "",
      verificationStatus = "",
      isActive = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search.trim(),
      vendorType,
      verificationStatus,
      isActive,
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
   * Get vendor filter statistics
   * GET /api/admin/vendors/stats
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
      throw new ApiError(
        500,
        error.message || "Failed to fetch vendor statistics"
      );
    }
  });

  /**
   * Get vendor details by ID
   * GET /api/admin/vendors/:vendorId
   */
  getVendorDetails = asyncHandler(async (req, res) => {
    console.log("🔍 Admin fetching vendor details:", req.params.vendorId);

    try {
      const vendor = await adminService.getVendorDetails(req.params.vendorId);

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            vendor,
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
   * Update vendor status (block/unblock)
   * PUT /api/admin/vendors/:vendorId/status
   */
  updateVendorStatus = asyncHandler(async (req, res) => {
    console.log("🔄 Admin updating vendor status:", req.params.vendorId, req.body);

    const { status } = req.body;

    if (!status || !["active", "blocked"].includes(status.toLowerCase())) {
      throw new ApiError(400, "Valid status is required (active or blocked)");
    }

    try {
      const result = await adminService.updateVendorStatus(
        req.params.vendorId,
        status
      );

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            `Vendor ${status.toLowerCase()}ed successfully`
          )
        );
    } catch (error) {
      console.error("❌ Update vendor status error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to update vendor status");
    }
  });

  /**
   * Delete vendor account
   * DELETE /api/admin/vendors/:vendorId
   */
  deleteVendor = asyncHandler(async (req, res) => {
    console.log("🗑️ Admin deleting vendor:", req.params.vendorId);

    try {
      const result = await adminService.deleteVendor(req.params.vendorId);

      res
        .status(200)
        .json(
          new ApiResponse(200, result, "Vendor deleted successfully")
        );
    } catch (error) {
      console.error("❌ Delete vendor error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to delete vendor");
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
      const result = await adminService.getVendorRejectionDetails(req.params.vendorId);

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
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
      const result = await adminService.clearVendorRejection(req.params.vendorId);

      res.status(200).json(
        new ApiResponse(
          200,
          result,
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
      const result = await adminService.getRejectionStats();

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
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

  // ===== BUYER MANAGEMENT =====

  /**
   * Get all buyers with filtering and pagination
   * GET /api/admin/buyers
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
   * Get buyer filter statistics
   * GET /api/admin/buyers/stats
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
      throw new ApiError(
        500,
        error.message || "Failed to fetch buyer statistics"
      );
    }
  });

  /**
   * Get buyer details by ID
   * GET /api/admin/buyers/:buyerId
   */
  getBuyerDetails = asyncHandler(async (req, res) => {
    console.log("🔍 Admin fetching buyer details:", req.params.buyerId);

    try {
      const buyer = await adminService.getBuyerDetails(req.params.buyerId);

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            buyer,
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
   * Update buyer status (block/unblock)
   * PUT /api/admin/buyers/:buyerId/status
   */
  updateBuyerStatus = asyncHandler(async (req, res) => {
    console.log("🔄 Admin updating buyer status:", req.params.buyerId, req.body);

    const { status } = req.body;

    if (!status || !["active", "blocked"].includes(status.toLowerCase())) {
      throw new ApiError(400, "Valid status is required (active or blocked)");
    }

    try {
      const result = await adminService.updateBuyerStatus(
        req.params.buyerId,
        status
      );

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            `Buyer ${status.toLowerCase()}ed successfully`
          )
        );
    } catch (error) {
      console.error("❌ Update buyer status error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to update buyer status");
    }
  });

  /**
   * Delete buyer account
   * DELETE /api/admin/buyers/:buyerId
   */
  deleteBuyer = asyncHandler(async (req, res) => {
    console.log("🗑️ Admin deleting buyer:", req.params.buyerId);

    try {
      const result = await adminService.deleteBuyer(req.params.buyerId);

      res
        .status(200)
        .json(
          new ApiResponse(200, result, "Buyer deleted successfully")
        );
    } catch (error) {
      console.error("❌ Delete buyer error:", error);
      throw error instanceof ApiError
        ? error
        : new ApiError(500, "Failed to delete buyer");
    }
  });

  // ===== PRODUCT MANAGEMENT =====

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