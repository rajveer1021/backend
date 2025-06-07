// src/validators/admin.validator.js - Admin API validation schemas

const { z } = require('zod');

// Vendor filter validation schema
const vendorFilterSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
  search: z.string().max(100).optional().default(''),
  vendorType: z.enum(['', 'all', 'MANUFACTURER', 'WHOLESALER', 'RETAILER']).optional().default(''),
  verificationStatus: z.enum(['', 'all', 'gst_verified', 'manually_verified', 'pending', 'verified', 'unverified']).optional().default(''),
  sortBy: z.enum(['name', 'email', 'businessName', 'createdAt', 'verified']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// Buyer filter validation schema
const buyerFilterSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
  search: z.string().max(100).optional().default(''),
  sortBy: z.enum(['name', 'email', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// Bulk verify vendors schema
const bulkVerifySchema = z.object({
  vendorIds: z.array(z.string().min(1, 'Vendor ID cannot be empty')).min(1, 'At least one vendor ID is required'),
  verified: z.boolean()
});

// Universal search schema
const universalSearchSchema = z.object({
  q: z.string().min(2, 'Search term must be at least 2 characters').max(100),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(5)
});

// Vendor verification schema
const vendorVerificationSchema = z.object({
  verified: z.boolean()
});

module.exports = {
  vendorFilterSchema,
  buyerFilterSchema,
  bulkVerifySchema,
  universalSearchSchema,
  vendorVerificationSchema
};