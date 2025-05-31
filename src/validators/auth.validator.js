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

const googleAuthSchema = z.object({
  token: z.string(),
  accountType: z.enum(['BUYER', 'VENDOR']).optional(),
});

module.exports = {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  googleAuthSchema,
};