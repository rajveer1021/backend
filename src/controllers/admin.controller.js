const adminService = require('../services/admin.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class AdminController {
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
}

module.exports = new AdminController();