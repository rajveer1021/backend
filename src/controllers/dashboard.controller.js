const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class DashboardController {
  getDashboardStats = asyncHandler(async (req, res) => {
    const result = await dashboardService.getVendorDashboardStats(req.user.vendor.id);
    res.status(200).json(new ApiResponse(200, result, 'Dashboard stats fetched successfully'));
  });
}

module.exports = new DashboardController();