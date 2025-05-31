// CRITICAL: Update your backend routes to fix the ordering issue

// In src/routes/product.routes.js
const express = require('express');
const productController = require('../controllers/product.controller');
const { protect, isVendor } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validation.middleware');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');

const router = express.Router();

// PUBLIC ROUTES FIRST (no authentication required)
router.get('/public/:id', productController.getProduct); // Public product view

// PROTECTED ROUTES (require authentication)
router.use(protect, isVendor);

// SEARCH ROUTE MUST COME FIRST - before any parameterized routes
router.get('/search', productController.searchProducts);

// Basic CRUD routes
router.post('/', 
  upload.array('images', 5),
  validate(createProductSchema),
  productController.createProduct
);

router.get('/', productController.getVendorProducts);

// Parameterized routes MUST come last to avoid conflicts
router.get('/:id', productController.getProduct);
router.put('/:id', 
  upload.array('images', 5),
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete('/:id', productController.deleteProduct);

module.exports = router;