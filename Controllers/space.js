import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";

const SpaceType = ["PRIVATE", "PUBLIC", "DESK", "MEETING", "VIP", "OTHER"];

export const createSpace = async (req, res, next) => {
  try {
    const { branchId, name, type, capacity, isActive, customTypeLabel } =
      req.body;
    const requiredFields = { branchId, name, type, capacity };
    for (let i in requiredFields) {
      if (!requiredFields[i]) {
        return next(
          new AppError(
            `${i.charAt(0).toUpperCase() + i.slice(1)} is required`,
            400,
          ),
        );
      }
    }
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!existingBranch || existingBranch === 0) {
      return next(new AppError("Branch not found", 404));
    }

    if (!SpaceType.includes(type)) {
      return next(new AppError("Invalid space type", 400));
    }
    if (customTypeLabel && type !== "OTHER") {
      return next(
        new AppError("customTypeLabel can only be set when type is OTHER", 400),
      );
    }
    const newSpace = await prisma.space.create({
      data: {
        branchId,
        name,
        type,
        capacity,
        isActive: isActive !== undefined ? isActive : true,
        customTypeLabel,
      },
    });
    res.status(201).json({
      status: "success",
      data: newSpace,
    });
  } catch (error) {
    next(error);
  }
};

export const getSpaceById = async (req, res, next) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return next(new AppError("Space ID is required", 400));
    }
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (!space || space === 0) {
      return next(new AppError("Space not found", 404));
    }
    res
      .status(200)
      .json({ status: "success", data: space, source: "database" });
  } catch (error) {
    next(error);
  }
};

export const getAllSpaces = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { page, limit, skip, sort, order } = pagination(req);
    const [spaces, total] = await prisma.$transaction([
      prisma.space.findMany({
        skip,
        take: limit,
        orderBy: { [sort]: order },
        where: branchId ? { branchId } : {},
      }),
      prisma.space.count({
        where: branchId ? { branchId } : {},
      }),
    ]);
    if (!spaces || spaces.length === 0) {
      return next(new AppError("No spaces found for this branch", 404));
    }
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      status: "success",
      data: spaces,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getSpaceByIsActive = async (req, res, next) => {
  try {
    const { branchId, isActive } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!existingBranch || existingBranch === 0) {
      return next(new AppError("Branch not found", 404));
    }
    if (!isActive) {
      return next(new AppError("isActive parameter is required", 400));
    }
    if (isActive !== "true" && isActive !== "false") {
      return next(new AppError("isActive must be true or false", 400));
    }
    const isActiveBool = isActive === "true";
    const spaces = await prisma.space.findMany({
      where: { branchId, isActive: isActiveBool },
    });
    if (!spaces || spaces.length === 0) {
      return next(
        new AppError("No spaces found with the specified isActive status", 404),
      );
    }
    res
      .status(200)
      .json({ status: "success", data: spaces, source: "database" });
  } catch (error) {
    next(error);
  }
};

export const getSpacesByType = async (req, res, next) => {
  try {
    let { branchId, type } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!existingBranch || existingBranch === 0) {
      return next(new AppError("Branch not found", 404));
    }
    if (!type) {
      return next(new AppError("Type is required", 400));
    }
    type = String(type).toUpperCase();
    if (!SpaceType.includes(type)) {
      return next(new AppError("Invalid space type", 400));
    }
    const spaces = await prisma.space.findMany({
      where: { branchId, type },
    });
    if (!spaces || spaces.length === 0) {
      return next(new AppError("No spaces found with the specified type", 404));
    }
    res
      .status(200)
      .json({ status: "success", data: spaces, source: "database" });
  } catch (error) {
    next(error);
  }
};

export const deleteSpaceById = async (req, res, next) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return next(new AppError("Space ID is required", 400));
    }
    const existingSpace = await prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (!existingSpace || existingSpace === 0) {
      return next(new AppError("Space not found", 404));
    }
    await prisma.space.delete({
      where: { id: spaceId },
    });
    res
      .status(200)
      .json({ status: "success", message: "Space deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteAllSpaces = async (req, res, next) => {
  try {
    const result = await prisma.space.deleteMany({});
    if (!result.count || result.count === 0) {
      return next(new AppError("No space records to delete", 404));
    }
    res.status(200).json({
      status: "success",
      message: "All spaces deleted",
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSpaceById = async (req, res, next) => {
  try {
    const { spaceId } = req.params;
    const allowedUpdates = [
      "name",
      "type",
      "capacity",
      "isActive",
      "customTypeLabel",
    ];
    const updates = { ...req.body };

    const isValidOperation = Object.keys(updates).filter((update) =>
      allowedUpdates.includes(update),
    );
    if (!isValidOperation || isValidOperation.length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }

    if (updates.type) {
      updates.type = String(updates.type).toUpperCase();
      if (!SpaceType.includes(updates.type)) {
        return next(new AppError("Invalid space type", 400));
      }
    }
    if (updates.customTypeLabel && updates.type !== "OTHER") {
      return next(
        new AppError("customTypeLabel can only be set when type is OTHER", 400),
      );
    }

    const existingSpace = await prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (updates.isActive !== undefined) {
      updates.isActive = Boolean(updates.isActive);
    }
    if (!existingSpace || existingSpace === 0) {
      return next(new AppError("Space not found", 404));
    }
    const updatedSpace = await prisma.space.update({
      where: { id: spaceId },
      data: updates,
    });
    res.status(200).json({ status: "success", data: updatedSpace });
  } catch (error) {
    next(error);
  }
};
