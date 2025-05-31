const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validation.middleware');
const {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  googleAuthSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/google', validate(googleAuthSchema), authController.googleAuth);
router.post('/change-password', protect, validate(changePasswordSchema), authController.changePassword);
router.get('/profile', protect, authController.getProfile);

module.exports = router;