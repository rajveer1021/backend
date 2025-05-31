const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized to access this route');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { vendor: true },
    });

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, 'Not authorized to access this route');
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.accountType)) {
      throw new ApiError(403, `User role ${req.user.accountType} is not authorized to access this route`);
    }
    next();
  };
};

const isVendor = authorize('VENDOR');
const isAdmin = authorize('ADMIN');
const isVendorOrAdmin = authorize('VENDOR', 'ADMIN');

module.exports = {
  protect,
  authorize,
  isVendor,
  isAdmin,
  isVendorOrAdmin,
};