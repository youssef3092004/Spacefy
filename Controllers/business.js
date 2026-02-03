import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";

export const createBusiness = async (req, res, next) => {
  try {
    const { name, ownerId } = req.body;
    if (!name || !ownerId) {
      return next(new AppError("Name and ownerId are required", 400));
    }
    const newBusiness = await prisma.business.create({
      data: {
        name,
        ownerId,
      },
    });

    const newSettings = await prisma.businessSettings.create({
      data: {
        businessId: newBusiness.id,
        defaultLanguage: "EN",
        notificationsEnabled: true,
        autoApprovePayroll: false,
      },
    });

    return res.status(201).json({
      success: true,
      data: { business: newBusiness, settings: newSettings },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getBusinessById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Business ID is required", 400));
    }
    const business = await prisma.business.findUnique({
      where: { id },
    });
    if (!business) {
      return next(new AppError("Business not found", 404));
    }
    res.status(200).json({
      success: true,
      data: business,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBusinesses = async (req, res, next) => {
  try {
    const { page, limit, skip, sort, order } = pagination(req);
    const [businesses, total] = await prisma.$transaction([
      prisma.business.findMany({
        skip,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.business.count(),
    ]);
    if (!businesses.length) {
      return next(new AppError("No businesses found", 404));
    }
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data: businesses,
      meta: {
        page,
        limit,
        total,
        totalPages,
        sort,
        order,
      },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBusinessById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Business ID is required", 400));
    }
    const business = await prisma.business.delete({
      where: { id },
    });
    if (!business) {
      return next(new AppError("Business not found", 404));
    }
    res.status(200).json({
      success: true,
      data: business,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllBusinesses = async (req, res, next) => {
  try {
    const deletedBusinesses = await prisma.business.deleteMany({});
    if (deletedBusinesses.count === 0) {
      return next(new AppError("No businesses to delete", 404));
    }
    res.status(200).json({
      success: true,
      data: deletedBusinesses,
      count: deletedBusinesses.count,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBusinessById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ownerId } = req.body;
    if (!id) {
      return next(new AppError("Business ID is required", 400));
    }
    const existingBusiness = await prisma.business.findUnique({
      where: { id },
    });
    if (!existingBusiness) {
      return next(new AppError("Business not found", 404));
    }
    if (!name || !ownerId) {
      return next(new AppError("Name and ownerId are required", 400));
    }
    const existOwner = await prisma.user.findUnique({
      where: { id: ownerId },
    });
    if (!existOwner) {
      return next(new AppError("Owner not found", 404));
    }
    const updatedBusiness = await prisma.business.update({
      where: { id: id },
      data: {
        owner: {
          connect: { id: ownerId },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updatedBusiness,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};
