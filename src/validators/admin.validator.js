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

// Updated vendor verification schema to include rejection reason
const vendorVerificationSchema = z.object({
  verified: z.boolean({
    required_error: "Verification status (verified) is required",
    invalid_type_error: "Verified must be a boolean value"
  }),
  rejectionReason: z.string()
    .min(1, "Rejection reason is required when rejecting a vendor")
    .max(500, "Rejection reason must be less than 500 characters")
    .optional()
}).refine((data) => {
  // If verified is false, rejectionReason is required
  if (data.verified === false && (!data.rejectionReason || data.rejectionReason.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Rejection reason is required when rejecting a vendor",
  path: ["rejectionReason"]
});

// Query parameter schema for vendor submissions with enhanced filtering
const vendorSubmissionQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val) || 1),
  limit: z.string().optional().default('10').transform(val => parseInt(val) || 10),
  verified: z.enum(['true', 'false', 'pending', 'rejected', 'all']).optional(),
  search: z.string().optional().default(''),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.string().optional().default('desc')
});

// Dashboard query parameters
const dashboardQuerySchema = z.object({
  limit: z.string().optional().default('10').transform(val => parseInt(val) || 10),
  dateRange: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d')
});

module.exports = {
  vendorFilterSchema,
  buyerFilterSchema,
  vendorVerificationSchema,
  vendorSubmissionQuerySchema,
  dashboardQuerySchema
};