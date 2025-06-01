// src/validators/auth.validator.js - Fixed validation schemas
const { z } = require('zod');

const signupSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  accountType: z.enum(['BUYER', 'VENDOR']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6).max(100),
});

// FIXED: Google Auth Schema to match frontend
const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
  accountType: z.enum(['BUYER', 'VENDOR']).default('VENDOR'),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
}).refine((data) => {
  return Object.keys(data).length > 0;
}, {
  message: "At least one field (firstName, lastName, or email) must be provided",
});

module.exports = {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  googleAuthSchema,
  updateProfileSchema,
};