const { z } = require('zod');

const vendorStep1Schema = z.object({
  vendorType: z.enum(['MANUFACTURER', 'WHOLESALER', 'RETAILER']),
});

const vendorStep2Schema = z.object({
  businessName: z.string().min(2).max(100),
  businessAddress1: z.string().min(5).max(200),
  businessAddress2: z.string().max(200).optional(),
  city: z.string().min(2).max(50),
  state: z.string().min(2).max(50),
  postalCode: z.string().regex(/^\d{6}$/),
});

const vendorStep3Schema = z.object({
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
});

module.exports = {
  vendorStep1Schema,
  vendorStep2Schema,
  vendorStep3Schema,
};