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

// Vendor verification schema (for POST/PUT body validation)
const vendorVerificationSchema = z.object({
  verified: z.boolean()
});

module.exports = {
  vendorFilterSchema,
  buyerFilterSchema,
  vendorVerificationSchema
};