const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

class ProductService {
  async createProduct(vendorId, data, images) {
    try {
      const productData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        category: data.category,
        stock: parseInt(data.stock) || 0,
        vendorId,
        images: images ? images.map(img => img.location) : [],
      };

      console.log('Creating product with data:', productData);

      const product = await prisma.product.create({
        data: productData,
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      console.log('Product created successfully:', product.id);
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new ApiError(500, `Failed to create product: ${error.message}`);
    }
  }

  async getVendorProducts(vendorId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: { 
            vendorId,
            isActive: true 
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            vendor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        }),
        prisma.product.count({
          where: { 
            vendorId,
            isActive: true 
          },
        }),
      ]);

      return {
        products,
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
      console.error('Error getting vendor products:', error);
      throw new ApiError(500, `Failed to fetch products: ${error.message}`);
    }
  }

  // Search products with filters (matches frontend expectation)
  async searchProducts(vendorId, filters) {
    try {
      const { page, limit, search, category, sortBy, sortOrder } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        vendorId,
        isActive: true, // Only show active products
      };

      // Add search filter
      if (search && search.trim()) {
        where.OR = [
          {
            name: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
        ];
      }

      // Add category filter
      if (category && category !== 'all') {
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

      console.log('Search query where clause:', JSON.stringify(where, null, 2));

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

      console.log(`Found ${products.length} products out of ${total} total`);

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
      console.error('Error searching products:', error);
      throw new ApiError(500, `Error searching products: ${error.message}`);
    }
  }

  // Get single product by ID (for product details)
  async getProductById(productId) {
    try {
      console.log('Fetching product with ID:', productId);

      const product = await prisma.product.findFirst({
        where: { 
          id: productId,
          isActive: true 
        },
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!product) {
        console.log('Product not found with ID:', productId);
        throw new ApiError(404, 'Product not found');
      }

      console.log('Product found:', product.id);
      return product;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error fetching product:', error);
      throw new ApiError(500, `Failed to fetch product: ${error.message}`);
    }
  }

  async updateProduct(productId, vendorId, data, images) {
    try {
      console.log('Updating product:', productId, 'for vendor:', vendorId);

      // Check if product belongs to vendor
      const existingProduct = await prisma.product.findFirst({
        where: {
          id: productId,
          vendorId,
        },
      });

      if (!existingProduct) {
        throw new ApiError(404, 'Product not found or you do not have permission to update it');
      }

      const updateData = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        stock: parseInt(data.stock) || 0,
      };

      // Only update category if provided
      if (data.category) {
        updateData.category = data.category;
      }
      
      // Handle images
      if (images && images.length > 0) {
        updateData.images = [...existingProduct.images, ...images.map(img => img.location)];
      }

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          vendor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      console.log('Product updated successfully:', productId);
      return updatedProduct;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error updating product:', error);
      throw new ApiError(500, `Failed to update product: ${error.message}`);
    }
  }

  async deleteProduct(productId, vendorId) {
    try {
      console.log('Deleting product:', productId, 'for vendor:', vendorId);

      // Check if product belongs to vendor
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          vendorId,
        },
      });

      if (!product) {
        throw new ApiError(404, 'Product not found or you do not have permission to delete it');
      }

      // Soft delete by setting isActive to false instead of hard delete
      // This preserves data integrity with inquiries
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      });

      console.log('Product deleted successfully:', productId);
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error deleting product:', error);
      throw new ApiError(500, `Failed to delete product: ${error.message}`);
    }
  }
}

module.exports = new ProductService();