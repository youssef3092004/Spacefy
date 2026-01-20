import { prisma } from "../configs/db.js";
import { redisClient } from "../configs/redis.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";

export const createBranch = async (req, res, next) => {
  try {
    const { name, address, businessId } = req.body;
    if (!name || !address || !businessId) {
      return next(
        new AppError("Name and address and businessId are required", 400),
      );
    }
    const existingBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!existingBusiness) {
      return next(new AppError("Associated business not found", 404));
    }
    const newBranch = await prisma.branch.create({
      data: {
        name,
        address,
        businessId,
      },
    });
    await redisClient.keys("branch:*");
    const keys = await redisClient.keys("branches:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(201).json({
      success: true,
      data: newBranch,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Branch ID is required", 400));
    }
    const branch = await prisma.branch.findUnique({
      where: { id },
    });
    if (!branch) {
      return next(new AppError("Branch not found", 404));
    }
    res.status(200).json({
      success: true,
      data: branch,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllBranches = async (req, res, next) => {
  try {
    const { page, limit, skip, sort, order } = pagination(req);
    const [branches, total] = await prisma.$transaction([
      prisma.branch.findMany({
        skip,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.branch.count(),
    ]);
    if (!branches.length) {
      return next(new AppError("No branches found", 404));
    }
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data: branches,
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

export const updateBranchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    if (!id) {
      return next(new AppError("Branch ID is required", 400));
    }
    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });
    if (!existingBranch) {
      return next(new AppError("Branch not found", 404));
    }
    if (!name || !address) {
      return next(new AppError("Name and address are required", 400));
    }
    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
      },
    });
    await redisClient.del(`branch:${id}`);
    const cacheKeys = await redisClient.keys("branches:*");
    if (cacheKeys.length > 0) {
      await redisClient.del(cacheKeys);
    }
    res.status(200).json({
      success: true,
      data: updatedBranch,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranchById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Branch ID is required", 400));
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
    });
    if (!branch) {
      return next(new AppError("Branch not found", 404));
    }

    await prisma.branch.delete({
      where: { id },
    });
    const keys = await redisClient.keys("branches:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllBranches = async (req, res, next) => {
  try {
    const deletedBranches = await prisma.branch.deleteMany({});
    if (deletedBranches.count === 0) {
      return next(new AppError("No branches to delete", 404));
    }
    await redisClient.del("branch:*");
    const keys = await redisClient.keys("branches:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(200).json({
      success: true,
      message: "All branches deleted successfully",
      count: deletedBranches.count,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};
export const getBranchesByBusinessId = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { page, limit, skip, sort, order } = pagination(req);
    if (!businessId) {
      return next(new AppError("Business ID is required", 400));
    }
    const [branches, total] = await prisma.$transaction([
      prisma.branch.findMany({
        where: { businessId },
        skip,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.branch.count({
        where: { businessId },
      }),
    ]);
    if (!branches.length) {
      return next(new AppError("No branches found for this business", 404));
    }
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data: branches,
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
