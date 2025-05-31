const inquiryService = require('../services/inquiry.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class InquiryController {
  createInquiry = asyncHandler(async (req, res) => {
    const { productId, message } = req.body;
    const result = await inquiryService.createInquiry(req.user.id, productId, message);
    res.status(201).json(new ApiResponse(201, result, 'Inquiry created successfully'));
  });

  getVendorInquiries = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const result = await inquiryService.getVendorInquiries(
      req.user.vendor.id,
      parseInt(page),
      parseInt(limit),
      status
    );
    res.status(200).json(new ApiResponse(200, result, 'Inquiries fetched successfully'));
  });

  updateInquiryStatus = asyncHandler(async (req, res) => {
    const { status, vendorResponse } = req.body;
    const result = await inquiryService.updateInquiryStatus(
      req.params.id,
      req.user.vendor.id,
      status,
      vendorResponse
    );
    res.status(200).json(new ApiResponse(200, result, 'Inquiry updated successfully'));
  });
}

module.exports = new InquiryController();