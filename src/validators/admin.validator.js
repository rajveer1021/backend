// src/validators/admin.validator.js - Simple fix

const { z } = require('zod');

// Vendor filter validation schema - make everything optional with defaults
const vendorFilterSchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val) || 1),
  limit: z.string().optional().default('10').transform(val => parseInt(val) || 10),
  search: z.string().optional().default(''),
  vendorType: z.string().optional().default(''),
  verificationStatus: z.string().optional().default(''),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.string().optional().default('desc')
});

// Buyer filter validation schema - make everything optional with defaults
const buyerFilterSchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val) || 1),
  limit: z.string().optional().default('10').transform(val => parseInt(val) || 10),
  search: z.string().optional().default(''),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.string().optional().default('desc')
});

// Bulk verify vendors schema (for POST/PUT body validation)
const bulkVerifySchema = z.object({
  vendorIds: z.array(z.string().min(1, 'Vendor ID cannot be empty')).min(1, 'At least one vendor ID is required'),
  verified: z.boolean()
});

// Universal search schema (for query parameters)
const universalSearchSchema = z.object({
  q: z.string().min(2, 'Search term must be at least 2 characters').max(100),
  limit: z.string().optional().default('5').transform(val => parseInt(val) || 5)
});

// Vendor verification schema (for POST/PUT body validation)
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