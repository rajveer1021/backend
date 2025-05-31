const vendorService = require('../services/vendor.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

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
}

module.exports = new VendorController();