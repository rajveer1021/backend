// src/services/auth.service.js - Complete implementation with account type selection

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');
const { googleClient } = require('../config/auth');

class AuthService {
  async signup(userData) {
    const { email, password, firstName, lastName, accountType } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError(400, 'User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          accountType,
        },
      });

      // Create vendor profile if account type is vendor
      if (accountType === 'VENDOR') {
        await tx.vendor.create({
          data: {
            userId: user.id,
          },
        });
      }

      return user;
    });

    return this.generateToken(result);
  }

  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { vendor: true },
    });

    if (!user || !user.password) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    return this.generateToken(user);
  }

  // UPDATED: Google Auth with account type selection flow
  async googleAuth(credential, accountType = null) {
    try {
      console.log('🔍 Verifying Google credential...');
      
      // Verify the Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      console.log('✅ Google payload verified:', {
        email: payload.email,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name
      });

      const { 
        email, 
        given_name, 
        family_name, 
        sub: googleId,
        name,
        picture 
      } = payload;

      if (!email) {
        throw new ApiError(400, 'Email not provided by Google');
      }

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email },
        include: { vendor: true },
      });

      if (!user) {
        // NEW USER: Check if account type is provided
        if (!accountType) {
          // Return special response indicating account type selection is needed
          return {
            needsAccountTypeSelection: true,
            userInfo: {
              email,
              name: name || `${given_name} ${family_name}`.trim(),
              firstName: given_name || name?.split(' ')[0] || 'User',
              lastName: family_name || name?.split(' ').slice(1).join(' ') || '',
              googleId,
              picture
            },
            message: 'Please select your account type to continue'
          };
        }

        // Create new user with selected account type
        const result = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              firstName: given_name || name?.split(' ')[0] || 'User',
              lastName: family_name || name?.split(' ').slice(1).join(' ') || '',
              googleId,
              accountType: accountType.toUpperCase(),
            },
            include: { vendor: true },
          });

          // Create vendor profile if account type is vendor
          if (accountType.toUpperCase() === 'VENDOR') {
            await tx.vendor.create({
              data: {
                userId: newUser.id,
              },
            });
            
            // Refetch user with vendor data
            const userWithVendor = await tx.user.findUnique({
              where: { id: newUser.id },
              include: { vendor: true },
            });
            
            return userWithVendor;
          }

          return newUser;
        });

        console.log('✅ New user created via Google Auth with account type:', accountType);
        return this.generateToken(result);

      } else {
        // EXISTING USER
        console.log('👤 Existing user found');
        
        // Link existing account with Google if not already linked
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId },
            include: { vendor: true },
          });
        }

        // Ensure vendor profile exists for vendor accounts
        if (user.accountType === 'VENDOR' && !user.vendor) {
          await prisma.vendor.create({
            data: {
              userId: user.id,
            },
          });
          
          // Refetch user with vendor data
          user = await prisma.user.findUnique({
            where: { id: user.id },
            include: { vendor: true },
          });
        }

        console.log('✅ Existing user Google authentication successful');
        return this.generateToken(user);
      }

    } catch (error) {
      console.error('🚨 Google Auth Service Error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error.message?.includes('Invalid token')) {
        throw new ApiError(400, 'Invalid Google credential');
      }
      
      if (error.message?.includes('Token used too late')) {
        throw new ApiError(400, 'Google credential has expired. Please try again.');
      }
      
      throw new ApiError(500, `Google authentication failed: ${error.message}`);
    }
  }

  // NEW METHOD: Set account type for Google users
  async setGoogleUserAccountType(email, googleId, accountType, userInfo = null) {
    try {
      console.log('🔧 Setting account type for Google user:', email, accountType);

      // Validate account type
      if (!['BUYER', 'VENDOR'].includes(accountType.toUpperCase())) {
        throw new ApiError(400, 'Invalid account type. Must be BUYER or VENDOR');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { googleId }
          ]
        },
      });

      if (existingUser) {
        throw new ApiError(409, 'User already exists');
      }

      // Create user with transaction
      const result = await prisma.$transaction(async (tx) => {
        const userData = {
          email,
          googleId,
          accountType: accountType.toUpperCase(),
        };

        // Use provided user info or defaults
        if (userInfo) {
          userData.firstName = userInfo.firstName || 'User';
          userData.lastName = userInfo.lastName || '';
        } else {
          userData.firstName = 'User';
          userData.lastName = '';
        }

        const user = await tx.user.create({
          data: userData,
          include: { vendor: true },
        });

        // Create vendor profile if account type is vendor
        if (accountType.toUpperCase() === 'VENDOR') {
          await tx.vendor.create({
            data: {
              userId: user.id,
            },
          });
          
          // Refetch user with vendor data
          const userWithVendor = await tx.user.findUnique({
            where: { id: user.id },
            include: { vendor: true },
          });
          
          return userWithVendor;
        }

        return user;
      });

      console.log('✅ Google user account type set successfully');
      return this.generateToken(result);

    } catch (error) {
      console.error('🚨 Set Google User Account Type Error:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, `Failed to set account type: ${error.message}`);
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user.password) {
      throw new ApiError(400, 'Cannot change password for Google OAuth users');
    }

    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordMatch) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId, profileData) {
    const { firstName, lastName, email } = profileData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new ApiError(404, 'User not found');
    }

    // If email is being updated, check if new email already exists
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new ApiError(400, 'Email already exists');
      }
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { vendor: true },
    });

    // Return updated user data without password
    const { password, ...userWithoutPassword } = updatedUser;
    
    return {
      user: userWithoutPassword,
      message: 'Profile updated successfully'
    };
  }

  generateToken(user) {
    const token = jwt.sign(
      { id: user.id, email: user.email, accountType: user.accountType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        googleId: user.googleId,
      },
    };
  }
}

module.exports = new AuthService();