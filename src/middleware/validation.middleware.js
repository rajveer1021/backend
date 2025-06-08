// src/middleware/validation.middleware.js - Simple fix for your current file

const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Handle both body and query parameters
      let dataToValidate;
      
      if (req.method === 'GET') {
        // For GET requests, validate query parameters
        dataToValidate = req.query || {};
      } else {
        // For POST/PUT/PATCH requests, validate body
        dataToValidate = req.body || {};
      }
      
      // Parse the request data with Zod
      const validatedData = schema.parse(dataToValidate);
            
      // Set the validated data back
      if (req.method === 'GET') {
        req.query = validatedData;
      } else {
        req.body = validatedData;
      }
      
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