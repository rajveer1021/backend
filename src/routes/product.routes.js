const express = require('express');
const productController = require('../controllers/product.controller');
const { protect, isVendor } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validation.middleware');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');

const router = express.Router();

// PUBLIC ROUTES FIRST (before authentication middleware)
// Get single product - this should be accessible to everyone
router.get('/:id', productController.getProduct);

// PROTECTED VENDOR ROUTES
router.use(protect, isVendor);

// Search route MUST come before parameterized routes
router.get('/search', productController.searchProducts);

// Base product routes
router
  .route('/')
  .post(
    upload.array('images', 5),
    validate(createProductSchema),
    productController.createProduct
  )
  .get(productController.getVendorProducts);

// Parameterized routes come last
router
  .route('/:id')
  .put(
    upload.array('images', 5),
    validate(updateProductSchema),
    productController.updateProduct
  )
  .delete(productController.deleteProduct);

module.exports = router;