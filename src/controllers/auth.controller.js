// src/controllers/auth.controller.js - Complete file with bypass
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

  // BYPASS: Google Auth - always use VENDOR account type
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
      // BYPASS: Force VENDOR account type regardless of what's sent
      const forcedAccountType = 'VENDOR';
      console.log(`🔧 Google Auth Bypass: Using forced account type: ${forcedAccountType}`);

      const result = await authService.googleAuth(credential, forcedAccountType);

      // BYPASS: Skip account type selection entirely
      if (result.needsAccountTypeSelection) {
        console.log("🔧 Bypassing account type selection - creating VENDOR account directly");
        
        // Extract user info and create account directly with VENDOR type
        const { userInfo } = result;
        
        try {
          const directResult = await authService.setGoogleUserAccountType(
            userInfo.email,
            userInfo.googleId,
            'VENDOR',
            {
              firstName: userInfo.firstName || userInfo.name?.split(' ')[0] || 'User',
              lastName: userInfo.lastName || userInfo.name?.split(' ').slice(1).join(' ') || '',
              name: userInfo.name,
              picture: userInfo.picture
            }
          );

          return res.status(200).json(new ApiResponse(200, directResult, "Google authentication successful - VENDOR account created"));
        } catch (setAccountError) {
          console.error("🚨 Failed to set account type in bypass:", setAccountError);
          return res.status(500).json({
            success: false,
            message: "Failed to create account. Please try again.",
          });
        }
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

  // Keep this method for potential future use, but it should rarely be called with the bypass
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
      // BYPASS: Force VENDOR for bypass even if different account type is requested
      const forcedAccountType = 'VENDOR';
      console.log(`🔧 Set Account Type Bypass: Using forced account type: ${forcedAccountType}`);

      const updatedUserInfo = userInfo
        ? {
            firstName: userInfo.firstName || "User",
            lastName: userInfo.lastName || "",
            email,
            googleId,
            accountType: forcedAccountType,
          }
        : null;

      const result = await authService.setGoogleUserAccountType(
        email,
        googleId,
        forcedAccountType,
        updatedUserInfo
      );

      res
        .status(201)
        .json(new ApiResponse(201, result, "VENDOR account created successfully"));
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