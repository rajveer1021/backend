const { z } = require('zod');

const vendorStep1Schema = z.object({
  vendorType: z.string().min(1, "Vendor type is required").refine((val) => {
    return ['MANUFACTURER', 'WHOLESALER', 'RETAILER'].includes(val.toUpperCase());
  }, {
    message: "Invalid vendor type. Must be MANUFACTURER, WHOLESALER, or RETAILER"
  })
});

const vendorStep2Schema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(100, "Business name too long"),
  businessAddress1: z.string().min(5, "Business address must be at least 5 characters").max(200, "Address too long"),
  businessAddress2: z.string().max(200, "Address too long").optional().default(""),
  city: z.string().min(2, "City must be at least 2 characters").max(50, "City name too long"),
  state: z.string().min(2, "State must be at least 2 characters").max(50, "State name too long"),
  postalCode: z.string().regex(/^\d{6}$/, "Postal code must be exactly 6 digits")
});

// FIXED: Enhanced Step 3 schema with better error messages
const vendorStep3Schema = z.object({
  verificationType: z.enum(['gst', 'manual'], {
    required_error: "Verification type is required",
    invalid_type_error: "Verification type must be either 'gst' or 'manual'"
  }),
  gstNumber: z.string().optional(),
  idType: z.string().optional(), 
  idNumber: z.string().optional(),
}).superRefine((data, ctx) => {
  const verificationType = data.verificationType.toLowerCase();
  
  if (verificationType === 'gst') {
    // GST validation
    if (!data.gstNumber || data.gstNumber.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstNumber'],
        message: "GST number is required for GST verification"
      });
      return;
    }
    
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(data.gstNumber.trim().toUpperCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstNumber'],
        message: "Invalid GST number format. Expected format: 22AAAAA0000A1Z5"
      });
    }
  } 
  else if (verificationType === 'manual') {
    // Manual verification validation
    if (!data.idType || data.idType.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['idType'],
        message: "ID type is required for manual verification"
      });
    }
    
    if (!data.idNumber || data.idNumber.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['idNumber'],
        message: "ID number is required for manual verification"
      });
      return;
    }
    
    const idType = (data.idType || '').toLowerCase();
    const idNumber = data.idNumber.trim();
    
    if (idType === 'aadhaar') {
      const cleanedAadhaar = idNumber.replace(/\s/g, '');
      if (!/^\d{12}$/.test(cleanedAadhaar)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idNumber'],
          message: "Invalid Aadhaar number. Must be 12 digits"
        });
      }
    } else if (idType === 'pan') {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(idNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idNumber'],
          message: "Invalid PAN format. Expected format: ABCDE1234F"
        });
      }
    } else if (idType && !['aadhaar', 'pan'].includes(idType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['idType'],
        message: "Invalid ID type. Must be 'aadhaar' or 'pan'"
      });
    }
  }
});

const productSearchSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  sortBy: z.enum(['name', 'createdAt', 'price', 'stock']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

module.exports = {
  vendorStep1Schema,
  vendorStep2Schema,
  vendorStep3Schema,
  productSearchSchema,
};