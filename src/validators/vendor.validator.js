// src/validators/vendor.validator.js - Fixed with proper string validation

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

// FIXED: Updated Step 3 schema with better validation
const vendorStep3Schema = z.object({
  verificationType: z.string().min(1, "Verification type is required").refine((val) => {
    return ['gst', 'manual'].includes(val.toLowerCase());
  }, {
    message: "Invalid verification type. Must be 'gst' or 'manual'"
  }),
  
  // GST verification fields (conditional)
  gstNumber: z.string().optional(),
  
  // Manual verification fields (conditional)
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  
}).refine((data) => {
  const verificationType = data.verificationType.toLowerCase();
  
  // If verification type is GST, GST number is required and must be valid
  if (verificationType === 'gst') {
    if (!data.gstNumber || typeof data.gstNumber !== 'string') {
      return false;
    }
    
    // Validate GST format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(data.gstNumber.trim());
  }
  
  // If verification type is manual, idType and idNumber are required
  if (verificationType === 'manual') {
    if (!data.idType || !data.idNumber || typeof data.idType !== 'string' || typeof data.idNumber !== 'string') {
      return false;
    }
    
    const idType = data.idType.toLowerCase();
    const idNumber = data.idNumber.trim();
    
    // Validate based on ID type
    if (idType === 'aadhaar') {
      // Aadhaar should be 12 digits (spaces removed)
      const cleanedAadhaar = idNumber.replace(/\s/g, '');
      return /^\d{12}$/.test(cleanedAadhaar);
    } else if (idType === 'pan') {
      // PAN should be 5 letters + 4 digits + 1 letter
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber.toUpperCase());
    } else {
      return false; // Invalid ID type
    }
  }
  
  return false; // Invalid verification type
}, {
  message: "Invalid verification data. Please check your inputs.",
  path: ["verificationType"] // This will show the error on verificationType field
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