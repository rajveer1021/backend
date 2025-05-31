const express = require('express');
const productController = require('../controllers/product.controller');
const { protect, isVendor } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validation.middleware');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');

const router = express.Router();

// Protect all routes
router.use(protect, isVendor);

router
  .route('/')
  .post(
    upload.array('images', 5),
    validate(createProductSchema),
    productController.createProduct
  )
  .get(productController.getVendorProducts);

router
  .route('/:id')
  .put(
    upload.array('images', 5),
    validate(updateProductSchema),
    productController.updateProduct
  )
  .delete(productController.deleteProduct);

module.exports = router;