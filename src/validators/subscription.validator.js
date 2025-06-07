const { z } = require('zod');

const subscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  originalPrice: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  limits: z.object({}).passthrough().optional()
});

const updateSubscriptionSchema = subscriptionSchema.partial();

const subscriptionIdSchema = z.object({
  id: z.string().min(1, "ID is required")
});

module.exports = {
  subscriptionSchema,
  updateSubscriptionSchema,
  subscriptionIdSchema
};