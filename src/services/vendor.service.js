const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');
const { checkProfileCompletion } = require('../utils/profileCompletion');

class VendorService {
  async updateStep1(userId, data) {
    const vendor = await prisma.vendor.update({
      where: { userId },
      data: {
        vendorType: data.vendorType,
        profileStep: 2,
      },
    });

    return { vendor, completion: checkProfileCompletion(vendor) };
  }

  async updateStep2(userId, data, businessLogo) {
    const updateData = {
      ...data,
      profileStep: 3,
    };

    if (businessLogo) {
      updateData.businessLogo = businessLogo.location;
    }

    const vendor = await prisma.vendor.update({
      where: { userId },
      data: updateData,
    });

    return { vendor, completion: checkProfileCompletion(vendor) };
  }

  async updateStep3(userId, data, files = {}) {
    const updateData = {
      gstNumber: data.gstNumber,
    };

    if (files.gstDocument && files.gstDocument[0]) {
      updateData.gstDocument = files.gstDocument[0].location;
    }

    if (files.otherDocuments) {
      updateData.otherDocuments = files.otherDocuments.map(file => file.location);
    }

    const vendor = await prisma.vendor.update({
      where: { userId },
      data: updateData,
    });

    const completion = checkProfileCompletion(vendor);
    
    if (completion.isComplete) {
      await prisma.vendor.update({
        where: { userId },
        data: { profileStep: 3 },
      });
    }

    return { vendor, completion };
  }

  async getProfile(userId) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new ApiError(404, 'Vendor profile not found');
    }

    return { vendor, completion: checkProfileCompletion(vendor) };
  }

  async searchProducts(vendorId, filters) {
  const { page, limit, search, category, sortBy, sortOrder } = filters;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    vendorId,
    isActive: true, // Only show active products
  };

  // Add search filter
  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: search,
          mode: 'insensitive',
        },
      },
    ];
  }

  // Add category filter
  if (category) {
    where.category = {
      equals: category,
      mode: 'insensitive',
    };
  }

  // Build orderBy clause
  let orderBy = {};
  
  switch (sortBy) {
    case 'name':
      orderBy.name = sortOrder.toLowerCase();
      break;
    case 'createdAt':
      orderBy.createdAt = sortOrder.toLowerCase();
      break;
    case 'price':
      orderBy.price = sortOrder.toLowerCase();
      break;
    case 'stock':
      orderBy.stock = sortOrder.toLowerCase();
      break;
    default:
      orderBy.createdAt = 'desc';
  }

  try {
    const [products, total, categories] = await Promise.all([
      // Get filtered products
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          images: true,
          stock: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      
      // Get total count for pagination
      prisma.product.count({ where }),
      
      // Get available categories for this vendor
      prisma.product.findMany({
        where: { vendorId, isActive: true },
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);

    // Extract unique categories
    const availableCategories = categories.map(item => item.category);

    return {
      products,
      availableCategories,
      filters: {
        search: search || null,
        category: category || null,
        sortBy,
        sortOrder,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw new ApiError(500, 'Error searching products');
  }
}

  async updateProfile(userId, data, files) {
    const updateData = { ...data };

    if (files?.businessLogo) {
      updateData.businessLogo = files.businessLogo[0].location;
    }

    if (files?.gstDocument) {
      updateData.gstDocument = files.gstDocument[0].location;
    }

    if (files?.otherDocuments) {
      updateData.otherDocuments = files.otherDocuments.map(file => file.location);
    }

    const vendor = await prisma.vendor.update({
      where: { userId },
      data: updateData,
    });

    return { vendor, completion: checkProfileCompletion(vendor) };
  }
}

module.exports = new VendorService();