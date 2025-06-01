// src/services/auth.service.js - Fixed with better Google Auth
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

  // FIXED: Improved Google Auth with better error handling
  async googleAuth(credential, accountType = 'VENDOR') {
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

      // Use transaction to ensure data consistency
      const result = await prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({
          where: { email },
          include: { vendor: true },
        });

        if (!user) {
          console.log('🆕 Creating new user via Google Auth');
          // Create new user
          user = await tx.user.create({
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
                userId: user.id,
              },
            });
            
            // Refetch user with vendor data
            user = await tx.user.findUnique({
              where: { id: user.id },
              include: { vendor: true },
            });
          }
        } else {
          console.log('👤 Existing user found, updating Google ID if needed');
          
          // Check if account types match
          if (user.accountType !== accountType.toUpperCase()) {
            throw new ApiError(409, `An account with this email already exists as a ${user.accountType.toLowerCase()}. Please sign in with the correct account type.`);
          }

          // Link existing account with Google if not already linked
          if (!user.googleId) {
            user = await tx.user.update({
              where: { id: user.id },
              data: { googleId },
              include: { vendor: true },
            });
          }

          // Ensure vendor profile exists for vendor accounts
          if (user.accountType === 'VENDOR' && !user.vendor) {
            await tx.vendor.create({
              data: {
                userId: user.id,
              },
            });
            
            // Refetch user with vendor data
            user = await tx.user.findUnique({
              where: { id: user.id },
              include: { vendor: true },
            });
          }
        }

        return user;
      });

      console.log('✅ Google authentication successful for user:', result.email);
      return this.generateToken(result);

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