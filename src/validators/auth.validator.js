// src/validators/auth.validator.js - Updated validation schemas

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

// UPDATED: Google Auth Schema - accountType is now optional
const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
  accountType: z.enum(['BUYER', 'VENDOR']).optional(), // Made optional for first-time flow
});

// NEW: Schema for setting Google user account type
const setGoogleAccountTypeSchema = z.object({
  email: z.string().email('Valid email is required'),
  googleId: z.string().min(1, 'Google ID is required'),
  accountType: z.enum(['BUYER', 'VENDOR'], {
    errorMap: () => ({ message: 'Account type must be either BUYER or VENDOR' })
  }),
  userInfo: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().max(50).optional(),
    name: z.string().optional(),
    picture: z.string().url().optional(),
  }).optional()
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
  setGoogleAccountTypeSchema, // NEW
  updateProfileSchema,
};