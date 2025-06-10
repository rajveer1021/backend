const vendorService = require('../services/vendor.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
<<<<<<< Updated upstream
=======
const ApiError = require('../utils/ApiError');
const prisma = require("../config/database");
>>>>>>> Stashed changes

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
    const result = await vendorService.updateStep3(req.user.id, req.body, req.files);
    res.status(200).json(new ApiResponse(200, result, 'Step 3 updated successfully'));
  });

  getProfile = asyncHandler(async (req, res) => {
    const result = await vendorService.getProfile(req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Profile fetched successfully'));
  });

  updateProfile = asyncHandler(async (req, res) => {
    const result = await vendorService.updateProfile(req.user.id, req.body, req.files);
    res.status(200).json(new ApiResponse(200, result, 'Profile updated successfully'));
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
}

module.exports = new VendorController();