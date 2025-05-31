const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(10).max(1000),
  price: z.number().positive(),
  category: z.string().min(2).max(50),
  stock: z.number().int().min(0),
});

const updateProductSchema = createProductSchema.partial();

module.exports = {
  createProductSchema,
  updateProductSchema,
};