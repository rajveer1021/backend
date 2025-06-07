// src/controllers/admin.controller.js - Enhanced with all vendor and buyer management APIs

const adminService = require('../services/admin.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/database'); // Added missing import

class AdminController {
  // ===== EXISTING CORE METHODS =====
  
  getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, accountType } = req.query;
    const result = await adminService.getAllUsers(
      parseInt(page),
      parseInt(limit),
      accountType
    );
    res.status(200).json(new ApiResponse(200, result, 'Users fetched successfully'));
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
    res.status(200).json(new ApiResponse(200, result, 'Vendor submissions fetched successfully'));
  });

  /**
   * 6. API to verify the vendor business profile ✅
   */
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

  // ===== ENHANCED VENDOR MANAGEMENT =====

  /**
   * 1. API to list all vendors on the platform ✅
   * 2. API to search and filter vendors by name, email, vendor type, verification status ✅
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

  // ===== BUYER MANAGEMENT =====

  /**
   * 3. API to list buyers on the platform ✅
   * 4. API to search and filter buyers by name, email ✅
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

  // ===== BULK ACTIONS =====

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
      const result = await adminService.bulkVerifyVendors(vendorIds, verified);

      res.status(200).json(new ApiResponse(
        200, 
        result, 
        `${result.updatedCount} vendors ${verified ? 'verified' : 'unverified'} successfully`
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

    try {
      const result = await adminService.universalSearch(searchTerm.trim(), limit);

      res.status(200).json(new ApiResponse(
        200, 
        result, 
        `Found ${result.totalResults} results for "${result.searchTerm}"`
      ));
    } catch (error) {
      console.error('❌ Universal search error:', error);
      throw new ApiError(500, 'Universal search failed');
    }
  });

  // ===== ADDITIONAL UTILITY METHODS =====

  /**
   * GET /api/admin/vendors/:vendorId - Get single vendor details
   */
  getVendorDetails = asyncHandler(async (req, res) => {
    console.log('🔍 Admin fetching vendor details:', req.params.vendorId);

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
            orderBy: { createdAt: 'desc' },
            take: 10, // Latest 10 products
          },
          _count: {
            select: {
              products: {
                where: { isActive: true }
              }
            }
          }
        },
      });

      if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
      }

      // Get additional statistics
      const [totalInquiries, recentInquiries] = await Promise.all([
        prisma.inquiry.count({
          where: {
            product: {
              vendorId: vendor.id,
              isActive: true
            }
          }
        }),
        prisma.inquiry.findMany({
          where: {
            product: {
              vendorId: vendor.id,
              isActive: true
            }
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
          orderBy: { createdAt: 'desc' },
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
          vendor.postalCode
        ].filter(Boolean).join(', '),
        statistics: {
          totalProducts: vendor._count.products,
          totalInquiries,
          activeProducts: vendor.products.filter(p => p.stock > 0).length,
          outOfStockProducts: vendor.products.filter(p => p.stock === 0).length,
        },
        recentInquiries,
      };

      res.status(200).json(new ApiResponse(200, vendorDetails, 'Vendor details fetched successfully'));
    } catch (error) {
      console.error('❌ Get vendor details error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to fetch vendor details');
    }
  });

  /**
   * GET /api/admin/buyers/:buyerId - Get single buyer details
   */
  getBuyerDetails = asyncHandler(async (req, res) => {
    console.log('🔍 Admin fetching buyer details:', req.params.buyerId);

    try {
      const buyer = await prisma.user.findFirst({
        where: { 
          id: req.params.buyerId,
          accountType: 'BUYER'
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
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              inquiries: true,
            },
          },
        },
      });

      if (!buyer) {
        throw new ApiError(404, 'Buyer not found');
      }

      const inquiryStats = {
        total: buyer._count.inquiries,
        open: buyer.inquiries.filter(i => i.status === 'OPEN').length,
        responded: buyer.inquiries.filter(i => i.status === 'RESPONDED').length,
        closed: buyer.inquiries.filter(i => i.status === 'CLOSED').length,
      };

      const buyerDetails = {
        ...buyer,
        fullName: `${buyer.firstName} ${buyer.lastName}`.trim(),
        isGoogleUser: !!buyer.googleId,
        inquiryStats,
        recentInquiries: buyer.inquiries.slice(0, 10), // Latest 10 inquiries
      };

      res.status(200).json(new ApiResponse(200, buyerDetails, 'Buyer details fetched successfully'));
    } catch (error) {
      console.error('❌ Get buyer details error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to fetch buyer details');
    }
  });
}

module.exports = new AdminController();