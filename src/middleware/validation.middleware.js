const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      const errorMessage = error.errors.map(err => err.message).join(', ');
      throw new ApiError(400, `Validation error: ${errorMessage}`);
    }
  };
};

module.exports = validate;