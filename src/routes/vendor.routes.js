const express = require('express');
const vendorController = require('../controllers/vendor.controller');
const { protect, isVendor } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validation.middleware');
const {
  vendorStep1Schema,
  vendorStep2Schema,
  vendorStep3Schema,
  productSearchSchema,
} = require('../validators/vendor.validator');

const router = express.Router();

// Protect all routes
router.use(protect, isVendor);

router.post('/onboarding/step1', validate(vendorStep1Schema), vendorController.updateStep1);
router.post(
  '/onboarding/step2',
  upload.single('businessLogo'),
  validate(vendorStep2Schema),
  vendorController.updateStep2
);
router.post(
  '/onboarding/step3',
  upload.fields([
    { name: 'gstDocument', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 5 },
  ]),
  validate(vendorStep3Schema),
  vendorController.updateStep3
);

router.get('/profile', vendorController.getProfile);
router.put(
  '/profile',
  upload.fields([
    { name: 'businessLogo', maxCount: 1 },
    { name: 'gstDocument', maxCount: 1 },
    { name: 'otherDocuments', maxCount: 5 },
  ]),
  vendorController.updateProfile
);

// NEW ROUTE: Search products with filters
router.get('/products/search', vendorController.searchProducts);

module.exports = router;