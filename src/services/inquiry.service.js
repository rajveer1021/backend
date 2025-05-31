const prisma = require('../config/database');
const ApiError = require('../utils/ApiError');

class InquiryService {
  async createInquiry(buyerId, productId, message) {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId,
        productId,
        message,
      },
      include: {
        product: {
          select: {
            name: true,
            vendorId: true,
          },
        },
      },
    });

    return inquiry;
  }

  async getVendorInquiries(vendorId, page = 1, limit = 10, status) {
    const skip = (page - 1) * limit;

    const where = {
      product: {
        vendorId,
      },
    };

    if (status) {
      where.status = status;
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.inquiry.count({ where }),
    ]);

    return {
      inquiries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateInquiryStatus(inquiryId, vendorId, status, vendorResponse) {
    // Check if inquiry belongs to vendor's product
    const inquiry = await prisma.inquiry.findFirst({
      where: {
        id: inquiryId,
        product: {
          vendorId,
        },
      },
    });

    if (!inquiry) {
      throw new ApiError(404, 'Inquiry not found');
    }

    const updateData = { status };
    
    if (vendorResponse) {
      updateData.vendorResponse = vendorResponse;
    }

    const updatedInquiry = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: updateData,
    });

    return updatedInquiry;
  }
}

module.exports = new InquiryService();