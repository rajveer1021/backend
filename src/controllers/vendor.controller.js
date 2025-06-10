// src/controllers/vendor.controller.js - Updated with rejection handling
const vendorService = require('../services/vendor.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const prisma = require("../config/database");

class VendorController {
  updateStep1 = asyncHandler(async (req, res) => {
    const result = await vendorService.updateStep1(req.user.id, req.body);
    res.status(200).json(new ApiResponse(200, result, 'Step 1 updated successfully'));
  });

  updateStep2 = asyncHandler(async (req, res) => {
    const result = await vendorService.updateStep2(req.user.id, req.body, req.file);
    res.status(200).json(new ApiResponse(200, result, 'Step 2 updated successfully'));
  });

  updateStep3 = asyncHandler(async (req, res) => {
    console.log('🔄 Step 3 update request from user:', req.user.id);
    console.log('📋 Request body:', req.body);
    console.log('📁 Files:', req.files ? Object.keys(req.files) : 'No files');

    // Check if vendor is resubmitting after rejection
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
      select: { verificationStatus: true, rejectionReason: true }
    });

    if (vendor?.verificationStatus === 'rejected') {
      console.log('📝 Vendor resubmitting after rejection');
    }

    const result = await vendorService.updateStep3(req.user.id, req.body, req.files);
    
    let message = 'Step 3 updated successfully';
    if (vendor?.verificationStatus === 'rejected') {
      message = 'Verification documents resubmitted successfully. Your application is now pending review.';
    }

    res.status(200).json(new ApiResponse(200, result, message));
  });

  getProfile = asyncHandler(async (req, res) => {
    console.log('👤 Getting vendor profile for user:', req.user.id);
    
    const result = await vendorService.getProfile(req.user.id);
    
    // Add additional context for rejected vendors
    let message = 'Profile fetched successfully';
    if (result.vendor.rejectionInfo?.isRejected) {
      message = 'Profile fetched successfully. Your verification was rejected - you can update your information and resubmit.';
    }

    res.status(200).json(new ApiResponse(200, result, message));
  });

  updateProfile = asyncHandler(async (req, res) => {
    console.log('🔄 Updating vendor profile for user:', req.user.id);
    
    const result = await vendorService.updateProfile(req.user.id, req.body, req.files);
    
    let message = 'Profile updated successfully';
    if (req.body.resubmitAfterRejection) {
      message = 'Profile updated and resubmitted for verification successfully';
    }
    
    res.status(200).json(new ApiResponse(200, result, message));
  });

  // NEW METHOD: Search products with filters
  searchProducts = asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    const result = await vendorService.searchProducts(
      req.user.vendor.id,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        category,
        sortBy,
        sortOrder
      }
    );
    
    res.status(200).json(new ApiResponse(200, result, 'Products search completed successfully'));
  });

  // NEW METHOD: Check if vendor can resubmit verification
  checkResubmissionStatus = asyncHandler(async (req, res) => {
    console.log('🔍 Checking resubmission status for user:', req.user.id);
    
    const result = await vendorService.canResubmitVerification(req.user.id);
    
    res.status(200).json(
      new ApiResponse(200, result, 'Resubmission status fetched successfully')
    );
  });

  // NEW METHOD: Get rejection details
  getRejectionDetails = asyncHandler(async (req, res) => {
    console.log('📋 Getting rejection details for user:', req.user.id);
    
    try {
      const result = await vendorService.getRejectionDetails(req.user.id);
      
      res.status(200).json(
        new ApiResponse(200, result, 'Rejection details fetched successfully')
      );
    } catch (error) {
      if (error.message === 'Vendor is not in rejected status') {
        res.status(200).json(
          new ApiResponse(200, { 
            isRejected: false,
            rejectionReason: null,
            rejectedAt: null,
            canResubmit: false 
          }, 'Vendor is not in rejected status')
        );
      } else {
        throw error;
      }
    }
  });

  // NEW METHOD: Resubmit verification after rejection
  resubmitVerification = asyncHandler(async (req, res) => {
    console.log('🔄 Resubmitting verification for user:', req.user.id);
    
    // Check if vendor is in rejected status
    const resubmissionStatus = await vendorService.canResubmitVerification(req.user.id);
    
    if (!resubmissionStatus.canResubmit) {
      throw new ApiError(400, 'Vendor is not eligible for resubmission');
    }

    // Process the resubmission based on the step
    const { step } = req.body;
    
    let result;
    let message = 'Verification resubmitted successfully';

    switch (step) {
      case 1:
        result = await vendorService.updateStep1(req.user.id, req.body);
        message = 'Step 1 resubmitted successfully';
        break;
      case 2:
        result = await vendorService.updateStep2(req.user.id, req.body, req.file);
        message = 'Step 2 resubmitted successfully';
        break;
      case 3:
        result = await vendorService.updateStep3(req.user.id, req.body, req.files);
        message = 'Verification documents resubmitted successfully. Your application is now pending review.';
        break;
      default:
        throw new ApiError(400, 'Invalid step specified for resubmission');
    }

    res.status(200).json(new ApiResponse(200, result, message));
  });

  // NEW METHOD: Get verification status
  getVerificationStatus = asyncHandler(async (req, res) => {
    console.log('📊 Getting verification status for user:', req.user.id);
    
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
      select: {
        verified: true,
        verificationStatus: true,
        rejectionReason: true,
        rejectedAt: true,
        profileStep: true,
        verificationType: true,
      },
    });

    if (!vendor) {
      throw new ApiError(404, 'Vendor profile not found');
    }

    const statusInfo = {
      verified: vendor.verified,
      verificationStatus: vendor.verificationStatus,
      verificationStatusLabel: vendorService.getVerificationStatusLabel(vendor),
      profileStep: vendor.profileStep,
      verificationType: vendor.verificationType,
      rejectionInfo: {
        isRejected: vendor.verificationStatus === 'rejected',
        rejectionReason: vendor.rejectionReason,
        rejectedAt: vendor.rejectedAt,
        canResubmit: vendor.verificationStatus === 'rejected',
      },
      nextSteps: this.getNextSteps(vendor),
    };

    res.status(200).json(
      new ApiResponse(200, statusInfo, 'Verification status fetched successfully')
    );
  });

  // Helper method to determine next steps for vendor
  getNextSteps(vendor) {
    if (vendor.verificationStatus === 'rejected') {
      return [
        'Review the rejection reason provided by the admin',
        'Update your profile information to address the issues',
        'Resubmit your verification documents',
        'Wait for admin review'
      ];
    } else if (vendor.verificationStatus === 'pending') {
      return [
        'Your verification is currently under review',
        'Please wait for admin approval',
        'You will be notified of the decision via email'
      ];
    } else if (vendor.verified && vendor.verificationStatus === 'verified') {
      return [
        'Your account is fully verified',
        'You can now list products and manage your business',
        'Keep your profile information up to date'
      ];
    } else {
      return [
        `Complete profile step ${vendor.profileStep}`,
        'Submit all required documents',
        'Wait for admin verification'
      ];
    }
  }
}

module.exports = new VendorController();