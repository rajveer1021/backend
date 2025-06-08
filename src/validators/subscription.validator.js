const { z } = require('zod');

// Basic subscription schema for creation
const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  originalPrice: z.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  limits: z.object({
    products: z.number().int().positive().optional().nullable(),
    inquiries: z.number().int().positive().optional().nullable()
  }).optional(),
  subscribers: z.number().int().min(0).optional().default(0)
});

// Schema for updates - all fields optional
const updateSubscriptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(10).optional(),
  price: z.number().positive().optional(),
  originalPrice: z.number().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  limits: z.object({
    products: z.number().int().positive().optional().nullable(),
    inquiries: z.number().int().positive().optional().nullable()
  }).optional(),
  subscribers: z.number().int().min(0).optional()
});

// ID validation
const subscriptionIdSchema = z.object({
  id: z.string().min(1, "ID is required")
});

// Status update schema
const subscriptionStatusSchema = z.object({
  isActive: z.boolean()
});

// Query parameters schema
const subscriptionQuerySchema = z.object({
  page: z.string().optional().default("1").transform(Number),
  limit: z.string().optional().default("10").transform(Number),
  isActive: z.string().optional().transform(val => val === 'true'),
  isPopular: z.string().optional().transform(val => val === 'true'),
  search: z.string().optional()
});

module.exports = {
  subscriptionSchema,
  updateSubscriptionSchema,
  subscriptionIdSchema,
  subscriptionStatusSchema,
  subscriptionQuerySchema
};