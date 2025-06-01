// src/middleware/validation.middleware.js - Complete fixed version

const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      
      // Parse the request body directly with Zod
      const validatedData = schema.parse(req.body);
            
      // Set the validated data back to req.body
      req.body = validatedData;
      next();
    } catch (error) {
      console.error('❌ Validation error:', error);
      
      if (error.errors) {
        // Zod validation errors
        const errorMessages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        }).join(', ');
        throw new ApiError(400, `Validation error: ${errorMessages}`);
      } else {
        // Other validation errors
        throw new ApiError(400, `Validation error: ${error.message}`);
      }
    }
  };
};

module.exports = validate;