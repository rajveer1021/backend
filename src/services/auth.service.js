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
      throw new ApiError(400, 'User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
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
      await prisma.vendor.create({
        data: {
          userId: user.id,
        },
      });
    }

    return this.generateToken(user);
  }

  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
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

  async googleAuth(token, accountType = 'BUYER') {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, sub: googleId } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          firstName: given_name,
          lastName: family_name,
          googleId,
          accountType,
        },
      });

      // Create vendor profile if account type is vendor
      if (accountType === 'VENDOR') {
        await prisma.vendor.create({
          data: {
            userId: user.id,
          },
        });
      }
    } else if (!user.googleId) {
      // Link existing account with Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    return this.generateToken(user);
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

  // FIXED: Update user profile method
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
      },
    };
  }
}

module.exports = new AuthService();