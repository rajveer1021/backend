const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

class ProductService {
  async createProduct(vendorId, data, images) {
    const productData = {
      ...data,
      vendorId,
      images: images ? images.map(img => img.location) : [],
    };

    const product = await prisma.product.create({
      data: productData,
    });

    return product;
  }

  async getVendorProducts(vendorId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { vendorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({
        where: { vendorId },
      }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateProduct(productId, vendorId, data, images) {
    // Check if product belongs to vendor
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        vendorId,
      },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const updateData = { ...data };
    
    if (images && images.length > 0) {
      updateData.images = [...product.images, ...images.map(img => img.location)];
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return updatedProduct;
  }

  async deleteProduct(productId, vendorId) {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        vendorId,
      },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Product deleted successfully' };
  }
}

module.exports = new ProductService();