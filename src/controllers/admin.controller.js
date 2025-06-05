// src/controllers/admin.controller.js - Enhanced with vendor and buyer management

const adminService = require('../services/admin.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class AdminController {
  // ===== EXISTING METHODS =====
  getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, accountType } = req.query;
    const result = await adminService.getAllUsers(
      parseInt(page),
      parseInt(limit),
      accountType
    );
    res.status(200).json(new ApiResponse(200, result, 'Users fetched successfully'));
  });

  getVendorSubmissions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, verified } = req.query;
    const result = await adminService.getVendorSubmissions(
      parseInt(page),
      parseInt(limit),
      verified
    );
    res.status(200).json(new ApiResponse(200, result, 'Vendor submissions fetched successfully'));
  });

  verifyVendor = asyncHandler(async (req, res) => {
    const { verified } = req.body;
    const result = await adminService.verifyVendor(req.params.vendorId, verified);
    res.status(200).json(new ApiResponse(200, result, 'Vendor verification updated successfully'));
  });

  getAllProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await adminService.getAllProducts(parseInt(page), parseInt(limit));
    res.status(200).json(new ApiResponse(200, result, 'Products fetched successfully'));
  });

  getDashboardStats = asyncHandler(async (req, res) => {
    const result = await adminService.getDashboardStats();
    res.status(200).json(new ApiResponse(200, result, 'Dashboard stats fetched successfully'));
  });

  // ===== NEW ENHANCED VENDOR MANAGEMENT =====

  /**
   * GET /api/admin/vendors - Get vendors with advanced search and filtering
   * Query parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10)
   * - search: Search term for name/email/business name
   * - vendorType: Filter by vendor type (MANUFACTURER, WHOLESALER, RETAILER)
   * - verificationStatus: Filter by verification status (gst_verified, manually_verified, pending, verified, unverified)
   * - sortBy: Sort field (name, email, businessName, createdAt, verified)
   * - sortOrder: Sort order (asc, desc)
   */
  getVendors = asyncHandler(async (req, res) => {
    console.log('📋 Admin fetching vendors with filters:', req.query);

    const {
      page = 1,
      limit = 10,
      search = '',
      vendorType = '',
      verificationStatus = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search.trim(),
      vendorType,
      verificationStatus,
      sortBy,
      sortOrder
    };

    const result = await adminService.getVendorsWithFilters(params);
    
    res.status(200).json(new ApiResponse(
      200, 
      result, 
      `Vendors fetched successfully. Found ${result.vendors.length} vendors out of ${result.pagination.total} total.`
    ));
  });

  /**
   * GET /api/admin/vendors/stats - Get vendor filter statistics
   */
  getVendorStats = asyncHandler(async (req, res) => {
    console.log('📊 Admin fetching vendor statistics');

    const result = await adminService.getVendorFilterStats();
    
    res.status(200).json(new ApiResponse(200, result, 'Vendor statistics fetched successfully'));
  });

  // ===== NEW BUYER MANAGEMENT =====

  /**
   * GET /api/admin/buyers - Get buyers with search and filtering
   * Query parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10)
   * - search: Search term for name/email
   * - sortBy: Sort field (name, email, createdAt)
   * - sortOrder: Sort order (asc, desc)
   */
  getBuyers = asyncHandler(async (req, res) => {
    console.log('👥 Admin fetching buyers with filters:', req.query);

    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search.trim(),
      sortBy,
      sortOrder
    };

    const result = await adminService.getBuyersWithFilters(params);
    
    res.status(200).json(new ApiResponse(
      200, 
      result, 
      `Buyers fetched successfully. Found ${result.buyers.length} buyers out of ${result.pagination.total} total.`
    ));
  });

  /**
   * GET /api/admin/buyers/stats - Get buyer filter statistics
   */
  getBuyerStats = asyncHandler(async (req, res) => {
    console.log('📊 Admin fetching buyer statistics');

    const result = await adminService.getBuyerFilterStats();
    
    res.status(200).json(new ApiResponse(200, result, 'Buyer statistics fetched successfully'));
  });

  // ===== BULK ACTIONS (BONUS) =====

  /**
   * PUT /api/admin/vendors/bulk-verify - Bulk verify/unverify vendors
   */
  bulkVerifyVendors = asyncHandler(async (req, res) => {
    console.log('🔄 Admin bulk verifying vendors:', req.body);

    const { vendorIds, verified } = req.body;

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'vendorIds array is required and must not be empty'
      });
    }

    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'verified field is required and must be a boolean'
      });
    }

    try {
      // Use transaction for bulk operation
      const result = await prisma.$transaction(
        vendorIds.map(vendorId => 
          prisma.vendor.update({
            where: { id: vendorId },
            data: { verified }
          })
        )
      );

      res.status(200).json(new ApiResponse(
        200, 
        { 
          updatedCount: result.length,
          updatedVendors: result 
        }, 
        `${result.length} vendors ${verified ? 'verified' : 'unverified'} successfully`
      ));
    } catch (error) {
      console.error('❌ Bulk verify error:', error);
      throw new ApiError(500, 'Failed to bulk update vendor verification status');
    }
  });

  /**
   * GET /api/admin/search - Universal search across users, vendors, and products
   */
  universalSearch = asyncHandler(async (req, res) => {
    console.log('🔍 Admin universal search:', req.query);

    const { q: searchTerm, limit = 5 } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters long'
      });
    }

    const search = searchTerm.trim();
    const searchLimit = parseInt(limit);

    try {
      const [users, vendors, products] = await Promise.all([
        // Search users
        prisma.user.findMany({
          where: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          },
          take: searchLimit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            accountType: true
          }
        }),

        // Search vendors by business name
        prisma.vendor.findMany({
          where: {
            businessName: { contains: search, mode: 'insensitive' }
          },
          take: searchLimit,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }),

        // Search products
        prisma.product.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          },
          take: searchLimit,
          include: {
            vendor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        })
      ]);

      const results = {
        users: users.map(user => ({
          ...user,
          type: 'user',
          display: `${user.firstName} ${user.lastName} (${user.email})`
        })),
        vendors: vendors.map(vendor => ({
          ...vendor,
          type: 'vendor',
          display: `${vendor.businessName} - ${vendor.user.firstName} ${vendor.user.lastName}`
        })),
        products: products.map(product => ({
          ...product,
          type: 'product',
          display: `${product.name} by ${product.vendor.user.firstName} ${product.vendor.user.lastName}`
        }))
      };

      const totalResults = users.length + vendors.length + products.length;

      res.status(200).json(new ApiResponse(
        200, 
        { results, totalResults }, 
        `Found ${totalResults} results for "${search}"`
      ));
    } catch (error) {
      console.error('❌ Universal search error:', error);
      throw new ApiError(500, 'Universal search failed');
    }
  });
}

module.exports = new AdminController();