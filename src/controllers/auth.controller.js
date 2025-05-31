const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

class AuthController {
  signup = asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);
    res.status(201).json(new ApiResponse(201, result, 'User registered successfully'));
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(new ApiResponse(200, result, 'Login successful'));
  });

  googleAuth = asyncHandler(async (req, res) => {
    const { token, accountType } = req.body;
    const result = await authService.googleAuth(token, accountType);
    res.status(200).json(new ApiResponse(200, result, 'Google authentication successful'));
  });

  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json(new ApiResponse(200, result, 'Password changed successfully'));
  });

  getProfile = asyncHandler(async (req, res) => {
    const { password, ...user } = req.user;
    res.status(200).json(new ApiResponse(200, { user }, 'Profile fetched successfully'));
  });

  // NEW METHOD: Update user profile
  updateProfile = asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json(new ApiResponse(200, result, 'Profile updated successfully'));
  });
}

module.exports = new AuthController();