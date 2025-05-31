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