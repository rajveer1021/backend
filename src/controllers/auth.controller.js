// src/controllers/auth.controller.js - Fixed version
const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");

class AuthController {
  signup = asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body);
    res
      .status(201)
      .json(new ApiResponse(201, result, "User registered successfully"));
  });

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(new ApiResponse(200, result, "Login successful"));
  });

  // FIXED: Google Auth with better error handling and credential processing
  googleAuth = asyncHandler(async (req, res) => {
    console.log("🔍 Google Auth Request Body:", req.body);

    const { credential, accountType } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    try {
      const result = await authService.googleAuth(credential, accountType);

      // Check if account type selection is needed
      if (result.needsAccountTypeSelection) {
        return res.status(200).json({
          success: true,
          needsAccountTypeSelection: true,
          userInfo: result.userInfo,
          message: result.message,
        });
      }

      // Normal successful authentication
      res
        .status(200)
        .json(new ApiResponse(200, result, "Google authentication successful"));
    } catch (error) {
      console.error("🚨 Google Auth Error:", error);

      // Send specific error messages
      if (error.message.includes("Invalid token")) {
        return res.status(400).json({
          success: false,
          message: "Invalid Google credential",
        });
      }

      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists with different authentication method",
        });
      }

      throw error; // Let error middleware handle other errors
    }
  });

  // NEW METHOD: Set account type for Google users
  setGoogleUserAccountType = asyncHandler(async (req, res) => {
    console.log("🔧 Set Google User Account Type Request:", req.body);

    const { email, googleId, accountType, userInfo } = req.body;

    if (!email || !googleId || !accountType) {
      return res.status(400).json({
        success: false,
        message: "Email, Google ID, and account type are required",
      });
    }

    try {
      // Update user info if provided
      const updatedUserInfo = userInfo
        ? {
            firstName: userInfo.firstName || "User",
            lastName: userInfo.lastName || "",
            email,
            googleId,
            accountType: accountType.toUpperCase(),
          }
        : null;

      const result = await authService.setGoogleUserAccountType(
        email,
        googleId,
        accountType,
        updatedUserInfo
      );

      res
        .status(201)
        .json(new ApiResponse(201, result, "Account type set successfully"));
    } catch (error) {
      console.error("🚨 Set Account Type Error:", error);

      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          message: "User account already exists",
        });
      }

      if (error.message.includes("Invalid account type")) {
        return res.status(400).json({
          success: false,
          message: "Invalid account type. Must be BUYER or VENDOR",
        });
      }

      throw error;
    }
  });

  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    res
      .status(200)
      .json(new ApiResponse(200, result, "Password changed successfully"));
  });

  getProfile = asyncHandler(async (req, res) => {
    const { password, ...user } = req.user;
    res
      .status(200)
      .json(new ApiResponse(200, { user }, "Profile fetched successfully"));
  });

  updateProfile = asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user.id, req.body);
    res
      .status(200)
      .json(new ApiResponse(200, result, "Profile updated successfully"));
  });
}

module.exports = new AuthController();
