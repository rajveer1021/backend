const productService = require('../services/product.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class ProductController {
  createProduct = asyncHandler(async (req, res) => {
    console.log('Creating product with body:', req.body);
    console.log('User vendor ID:', req.user.vendor?.id);
    
    if (!req.user.vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile not found. Please complete vendor onboarding first.',
      });
    }

    const result = await productService.createProduct(
      req.user.vendor.id,
      req.body,
      req.files?.images
    );
    
    res.status(201).json(new ApiResponse(201, result, 'Product created successfully'));
  });

  getVendorProducts = asyncHandler(async (req, res) => {
    console.log('Getting vendor products for vendor:', req.user.vendor?.id);
    
    if (!req.user.vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const result = await productService.getVendorProducts(
      req.user.vendor.id,
      parseInt(page),
      parseInt(limit)
    );
    
    res.status(200).json(new ApiResponse(200, result, 'Products fetched successfully'));
  });

  // Search products with filters (matches frontend API call)
  searchProducts = asyncHandler(async (req, res) => {
    console.log('Searching products with query:', req.query);
    console.log('User vendor ID:', req.user.vendor?.id);
    
    if (!req.user.vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      search, 
      category, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    const result = await productService.searchProducts(
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

  // Get single product (for product details view) - PUBLIC ACCESS
  getProduct = asyncHandler(async (req, res) => {
    console.log('Getting product with ID:', req.params.id);
    
    const result = await productService.getProductById(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Product fetched successfully'));
  });

  updateProduct = asyncHandler(async (req, res) => {
    console.log('Updating product:', req.params.id, 'with body:', req.body);
    console.log('User vendor ID:', req.user.vendor?.id);
    
    if (!req.user.vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const result = await productService.updateProduct(
      req.params.id,
      req.user.vendor.id,
      req.body,
      req.files?.images
    );
    
    res.status(200).json(new ApiResponse(200, result, 'Product updated successfully'));
  });

  deleteProduct = asyncHandler(async (req, res) => {
    console.log('Deleting product:', req.params.id);
    console.log('User vendor ID:', req.user.vendor?.id);
    
    if (!req.user.vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor profile not found',
      });
    }

    const result = await productService.deleteProduct(req.params.id, req.user.vendor.id);
    res.status(200).json(new ApiResponse(200, result, 'Product deleted successfully'));
  });
}

module.exports = new ProductController();