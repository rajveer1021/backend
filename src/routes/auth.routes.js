const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  googleAuthSchema,
  setGoogleAccountTypeSchema, // NEW
  updateProfileSchema,
} = require('../validators/auth.validator');

const router = express.Router();

// Public routes
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);

// Google Auth routes
router.post('/google', validate(googleAuthSchema), authController.googleAuth);
router.post('/google/set-account-type', validate(setGoogleAccountTypeSchema), authController.setGoogleUserAccountType); // NEW

// Protected routes
router.use(protect); // Apply protection to all routes below
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);
router.get('/profile', authController.getProfile);
router.put('/profile', validate(updateProfileSchema), authController.updateProfile);

module.exports = router;