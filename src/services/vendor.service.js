// src/services/vendor.service.js - Updated with rejection handling

const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');
const { checkProfileCompletion } = require('../utils/profileCompletion');

class VendorService {
  async updateStep1(userId, data) {
    try {
      const vendorType = String(data.vendorType || '').toUpperCase().trim();
      
      if (!vendorType) {
        throw new ApiError(400, 'Vendor type is required');
      }

      const validTypes = ['MANUFACTURER', 'WHOLESALER', 'RETAILER'];
      if (!validTypes.includes(vendorType)) {
        throw new ApiError(400, 'Invalid vendor type. Must be MANUFACTURER, WHOLESALER, or RETAILER');
      }

      const vendor = await prisma.vendor.update({
        where: { userId },
        data: {
          vendorType: vendorType,
          profileStep: 2,
        },
      });

      return { vendor, completion: checkProfileCompletion(vendor) };
    } catch (error) {
      console.error('❌ Step 1 update error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to update vendor type');
    }
  }

  async updateStep2(userId, data, businessLogo) {
    try {
      const businessName = String(data.businessName || '').trim();
      const businessAddress1 = String(data.businessAddress1 || '').trim();
      const businessAddress2 = String(data.businessAddress2 || '').trim();
      const city = String(data.city || '').trim();
      const state = String(data.state || '').trim();
      const postalCode = String(data.postalCode || '').trim();

      if (!businessName || businessName.length < 2) {
        throw new ApiError(400, 'Business name must be at least 2 characters');
      }
      if (!businessAddress1 || businessAddress1.length < 5) {
        throw new ApiError(400, 'Business address must be at least 5 characters');
      }
      if (!city || city.length < 2) {
        throw new ApiError(400, 'City must be at least 2 characters');
      }
      if (!state || state.length < 2) {
        throw new ApiError(400, 'State must be at least 2 characters');
      }
      if (!postalCode || !/^\d{6}$/.test(postalCode)) {
        throw new ApiError(400, 'Postal code must be exactly 6 digits');
      }

      const updateData = {
        businessName,
        businessAddress1,
        businessAddress2,
        city,
        state,
        postalCode,
        profileStep: 3,
      };

      if (businessLogo) {
        updateData.businessLogo = businessLogo.location;
      }

      const vendor = await prisma.vendor.update({
        where: { userId },
        data: updateData,
      });

      return { vendor, completion: checkProfileCompletion(vendor) };
    } catch (error) {
      console.error('❌ Step 2 update error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to update business information');
    }
  }

  async updateStep3(userId, data, files = {}) {
    try {
      // Clean and validate input data
      const verificationType = String(data.verificationType || '').toLowerCase().trim();
      
      if (!verificationType) {
        throw new ApiError(400, 'Verification type is required');
      }

      if (!['gst', 'manual'].includes(verificationType)) {
        throw new ApiError(400, 'Invalid verification type. Must be "gst" or "manual"');
      }

      const updateData = {
        verificationType: verificationType,
        profileStep: 3, // Always set to step 3 when updating
        // Reset verification status when resubmitting after rejection
        verificationStatus: 'pending',
        verified: false,
        // Clear any previous rejection data when resubmitting
        rejectionReason: null,
        rejectedAt: null,
      };

      if (verificationType === 'gst') {
        // Handle GST verification
        const gstNumber = String(data.gstNumber || '').trim().toUpperCase();
        
        if (!gstNumber) {
          throw new ApiError(400, 'GST number is required for GST verification');
        }

        // Validate GST format
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstNumber)) {
          throw new ApiError(400, 'Invalid GST number format');
        }

        updateData.gstNumber = gstNumber;
        // Clear manual verification fields when using GST
        updateData.idType = null;
        updateData.idNumber = null;
        
        if (files.gstDocument && files.gstDocument[0]) {
          updateData.gstDocument = files.gstDocument[0].location;
        }

      } else if (verificationType === 'manual') {
        // Handle manual verification
        const idType = String(data.idType || '').toLowerCase().trim();
        let idNumber = String(data.idNumber || '').trim();
        
        if (!idType || !idNumber) {
          throw new ApiError(400, 'ID type and ID number are required for manual verification');
        }

        // Validate ID type
        if (!['aadhaar', 'pan'].includes(idType)) {
          throw new ApiError(400, 'Invalid ID type. Must be "aadhaar" or "pan"');
        }

        // Format and validate ID number based on type
        if (idType === 'pan') {
          idNumber = idNumber.toUpperCase();
          const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
          if (!panRegex.test(idNumber)) {
            throw new ApiError(400, 'Invalid PAN format. Should be like ABCDE1234F');
          }
        } else if (idType === 'aadhaar') {
          idNumber = idNumber.replace(/\s/g, ''); // Remove spaces
          const aadhaarRegex = /^\d{12}$/;
          if (!aadhaarRegex.test(idNumber)) {
            throw new ApiError(400, 'Invalid Aadhaar format. Should be 12 digits');
          }
        }

        updateData.idType = idType;
        updateData.idNumber = idNumber;
        // Clear GST fields when using manual verification
        updateData.gstNumber = null;
        updateData.gstDocument = null;

        // Handle document uploads for manual verification
        if (files.otherDocuments && files.otherDocuments.length > 0) {
          updateData.otherDocuments = files.otherDocuments.map(file => file.location);
        }
      }
    
      const vendor = await prisma.vendor.update({
        where: { userId },
        data: updateData,
      });

      const completion = checkProfileCompletion(vendor);
        
      return { vendor, completion };
    } catch (error) {
      console.error('❌ Step 3 update error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to update verification details');
    }
  }

  async getProfile(userId) {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!vendor) {
        throw new ApiError(404, 'Vendor profile not found');
      }

      // Add rejection information to the profile response
      const profileData = {
        vendor: {
          ...vendor,
          verificationStatusLabel: this.getVerificationStatusLabel(vendor),
          rejectionInfo: {
            isRejected: vendor.verificationStatus === 'rejected',
            rejectionReason: vendor.rejectionReason,
            rejectedAt: vendor.rejectedAt,
            canResubmit: vendor.verificationStatus === 'rejected', // Allow resubmission if rejected
          },
        },
        completion: checkProfileCompletion(vendor),
      };

      return profileData;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to fetch vendor profile');
    }
  }

  // Helper method to get verification status label
  getVerificationStatusLabel(vendor) {
    if (vendor.verified && vendor.verificationStatus === 'verified') {
      if (vendor.verificationType === 'gst') {
        return 'GST Verified';
      } else if (vendor.verificationType === 'manual') {
        return 'Manually Verified';
      }
      return 'Verified';
    } else if (vendor.verificationStatus === 'rejected') {
      return 'Rejected';
    } else if (vendor.verificationStatus === 'pending') {
      return 'Pending Verification';
    } else if (!vendor.verified && !vendor.verificationStatus) {
      return 'Pending Verification';
    } else {
      return 'Unknown Status';
    }
  }

  async searchProducts(vendorId, filters) {
    try {
      const { page, limit, search, category, sortBy, sortOrder } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        vendorId,
        isActive: true,
      };

      // Add search filter
      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      // Add category filter
      if (category) {
        where.category = {
          equals: category,
          mode: 'insensitive',
        };
      }

      // Build orderBy clause
      let orderBy = {};
      
      switch (sortBy) {
        case 'name':
          orderBy.name = sortOrder.toLowerCase();
          break;
        case 'createdAt':
          orderBy.createdAt = sortOrder.toLowerCase();
          break;
        case 'price':
          orderBy.price = sortOrder.toLowerCase();
          break;
        case 'stock':
          orderBy.stock = sortOrder.toLowerCase();
          break;
        default:
          orderBy.createdAt = 'desc';
      }

      const [products, total, categories] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            category: true,
            images: true,
            stock: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        
        prisma.product.count({ where }),
        
        prisma.product.findMany({
          where: { vendorId, isActive: true },
          select: { category: true },
          distinct: ['category'],
          orderBy: { category: 'asc' },
        }),
      ]);

      const availableCategories = categories.map(item => item.category);

      return {
        products,
        availableCategories,
        filters: {
          search: search || null,
          category: category || null,
          sortBy,
          sortOrder,
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('❌ Search products error:', error);
      throw new ApiError(500, 'Error searching products');
    }
  }

  async updateProfile(userId, data, files) {
    try {
      const updateData = { ...data };

      // If vendor is updating their profile after rejection, reset verification status
      const currentVendor = await prisma.vendor.findUnique({
        where: { userId },
        select: { verificationStatus: true }
      });

      if (currentVendor?.verificationStatus === 'rejected') {
        updateData.verificationStatus = 'pending';
        updateData.verified = false;
        updateData.rejectionReason = null;
        updateData.rejectedAt = null;
      }

      if (files?.businessLogo) {
        updateData.businessLogo = files.businessLogo[0].location;
      }

      if (files?.gstDocument) {
        updateData.gstDocument = files.gstDocument[0].location;
      }

      if (files?.otherDocuments) {
        updateData.otherDocuments = files.otherDocuments.map(file => file.location);
      }

      const vendor = await prisma.vendor.update({
        where: { userId },
        data: updateData,
      });

      return { vendor, completion: checkProfileCompletion(vendor) };
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to update profile');
    }
  }

  /**
   * Check if vendor can resubmit after rejection
   */
  async canResubmitVerification(userId) {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { userId },
        select: {
          verificationStatus: true,
          rejectedAt: true,
        },
      });

      if (!vendor) {
        throw new ApiError(404, 'Vendor not found');
      }

      // Allow resubmission if rejected
      return {
        canResubmit: vendor.verificationStatus === 'rejected',
        isRejected: vendor.verificationStatus === 'rejected',
        rejectedAt: vendor.rejectedAt,
      };
    } catch (error) {
      console.error('❌ Check resubmit error:', error);
      throw new ApiError(500, 'Failed to check resubmission status');
    }
  }

  /**
   * Get vendor rejection details
   */
  async getRejectionDetails(userId) {
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { userId },
        select: {
          id: true,
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
        throw new ApiError(404, 'Vendor not found');
      }

      if (vendor.verificationStatus !== 'rejected') {
        throw new ApiError(400, 'Vendor is not in rejected status');
      }

      return {
        isRejected: true,
        rejectionReason: vendor.rejectionReason,
        rejectedAt: vendor.rejectedAt,
        canResubmit: true,
        vendorName: `${vendor.user.firstName} ${vendor.user.lastName}`.trim(),
        vendorEmail: vendor.user.email,
      };
    } catch (error) {
      console.error('❌ Get rejection details error:', error);
      throw error instanceof ApiError ? error : new ApiError(500, 'Failed to get rejection details');
    }
  }
}

module.exports = new VendorService();