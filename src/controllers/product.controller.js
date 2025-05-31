const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class ProductController {
  createProduct = asyncHandler(async (req, res) => {
    const result = await productService.createProduct(
      req.user.vendor.id,
      req.body,
      req.files?.images
    );
    res.status(201).json(new ApiResponse(201, result, 'Product created successfully'));
  });

  getVendorProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await productService.getVendorProducts(
      req.user.vendor.id,
      parseInt(page),
      parseInt(limit)
    );
    res.status(200).json(new ApiResponse(200, result, 'Products fetched successfully'));
  });

  updateProduct = asyncHandler(async (req, res) => {
    const result = await productService.updateProduct(
      req.params.id,
      req.user.vendor.id,
      req.body,
      req.files?.images
    );
    res.status(200).json(new ApiResponse(200, result, 'Product updated successfully'));
  });

  deleteProduct = asyncHandler(async (req, res) => {
    const result = await productService.deleteProduct(req.params.id, req.user.vendor.id);
    res.status(200).json(new ApiResponse(200, result, 'Product deleted successfully'));
  });
}

module.exports = new ProductController();