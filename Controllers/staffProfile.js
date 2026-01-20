import { prisma } from "../configs/db.js";
import { redisClient } from "../configs/redis.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";

export const createStaffProfile = async (req, res, next) => {
  try {
    const {
      userId,
      branchId,
      baseSalary,
      hireDate,
      position,
      department,
      profileImage,
      nationalIdNumber,
      nationalIdFrontImage,
      nationalIdBackImage,
    } = req.body;
    const requiredFields = {
      userId,
      branchId,
      baseSalary,
      hireDate,
      position,
      nationalIdNumber,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return next(
          new AppError(
            `${key.charAt(0).toUpperCase() + key.slice(1)} is required`,
            400,
          ),
        );
      }
    }
    if (!hireDate || isNaN(Date.parse(hireDate))) {
      return next(new AppError("hireDate must be a valid datetime", 400));
    }
    const nationalId = {
      number: nationalIdNumber,
      frontImage: nationalIdFrontImage,
      backImage: nationalIdBackImage,
    };
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return next(new AppError("Associated user not found", 404));
    }
    const existingProfile = await prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (existingProfile) {
      return next(
        new AppError("Staff profile for this user already exists", 400),
      );
    }
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!existingBranch) {
      return next(new AppError("Associated branch not found", 404));
    }
    const newStaffProfile = await prisma.staffProfile.create({
      data: {
        userId,
        branchId,
        baseSalary,
        hireDate: new Date(hireDate),
        position,
        department,
        profileImage,
        nationalId,
      },
    });
    await redisClient.keys("staffProfile:*");
    const keys = await redisClient.keys("staffProfiles:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(201).json({
      success: true,
      data: newStaffProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Staff Profile ID is required", 400));
    }
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { id },
      include: {
        user: {
          include: { role: { select: { id: true, name: true } } },
        },
      },
    });
    if (!staffProfile) {
      return next(new AppError("Staff Profile not found", 404));
    }
    res.status(200).json({
      success: true,
      data: staffProfile,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllStaffProfiles = async (req, res, next) => {
  try {
    const { page, limit, skip, sort, order } = pagination(req);

    const [staffProfiles, total] = await prisma.$transaction([
      prisma.staffProfile.findMany({
        skip,
        take: limit,
        include: {
          user: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { [sort]: order },
      }),
      prisma.staffProfile.count(),
    ]);

    if (!staffProfiles || staffProfiles.length === 0) {
      return next(new AppError("No staff profiles found", 404));
    }

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: staffProfiles,
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

export const updateStaffProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      userId,
      branchId,
      baseSalary,
      hireDate,
      position,
      department,
      profileImage,
      nationalIdNumber,
      nationalIdFrontImage,
      nationalIdBackImage,
    } = req.body;
    if (!id) {
      return next(new AppError("Staff Profile ID is required", 400));
    }
    const requiredFields = {
      userId,
      branchId,
      baseSalary,
      hireDate,
      position,
      department,
      profileImage,
      nationalIdNumber,
      nationalIdFrontImage,
      nationalIdBackImage,
    };
    for (const i in requiredFields) {
      if (!requiredFields[i]) {
        return next(
          new AppError(
            `${i.charAt(0).toUpperCase() + i.slice(1)} is required`,
            400,
          ),
        );
      }
    }

    if (!hireDate || isNaN(Date.parse(hireDate))) {
      return next(new AppError("hireDate must be a valid datetime", 400));
    }

    const updatedStaffProfile = await prisma.staffProfile.update({
      where: { id },
      data: {
        userId,
        branchId,
        baseSalary,
        hireDate: new Date(hireDate),
        position,
        department,
        profileImage,
        nationalId: {
          number: nationalIdNumber,
          frontImage: nationalIdFrontImage,
          backImage: nationalIdBackImage,
        },
      },
    });
    await redisClient.del(`staffProfile:${id}`);
    const cacheKeys = await redisClient.keys("staffProfiles:*");
    if (cacheKeys.length > 0) {
      await redisClient.del(cacheKeys);
    }
    res.status(200).json({
      status: "success",
      data: updatedStaffProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStaffProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("Staff Profile ID is required", 400));
    }
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { id },
    });
    if (!staffProfile) {
      return next(new AppError("Staff Profile not found", 404));
    }

    await prisma.staffProfile.delete({
      where: { id },
    });
    await redisClient.del(`staffProfile:${id}`);
    const keys = await redisClient.keys("staffProfiles:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(200).json({
      status: "success",
      message: "Staff Profile deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllStaffProfiles = async (req, res, next) => {
  try {
    const result = await prisma.staffProfile.deleteMany({});
    if (result.count === 0) {
      return next(new AppError("No staff profiles to delete", 404));
    }
    const keys = await redisClient.keys("staffProfiles:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(200).json({
      status: "success",
      message: "All staff profiles deleted successfully",
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffProfilesByBranchId = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { page, limit, skip, sort, order } = pagination(req);
    const [staffProfiles, total] = await prisma.$transaction([
      prisma.staffProfile.findMany({
        where: { branchId },
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          user: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.staffProfile.count({ where: { branchId } }),
    ]);

    if (!staffProfiles || staffProfiles.length === 0) {
      return next(new AppError("No staff profiles found for this branch", 404));
    }
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: staffProfiles,
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

export const getStaffProfileByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return next(new AppError("User ID is required", 400));
    }
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: { role: { select: { id: true, name: true } } },
        },
      },
    });
    if (!staffProfile) {
      return next(new AppError("Staff Profile not found for this user", 404));
    }
    res.status(200).json({
      success: true,
      data: staffProfile,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffProfilesCount = async (req, res, next) => {
  try {
    const count = await prisma.staffProfile.count();
    if (count === 0) {
      return next(new AppError("No staff profiles found", 404));
    }
    res.status(200).json({
      success: true,
      data: { count },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const updateStaffProfileByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      branchId,
      baseSalary,
      hireDate,
      position,
      department,
      profileImage,
      nationalIdNumber,
      nationalIdFrontImage,
      nationalIdBackImage,
    } = req.body;

    const requiredFields = {
      branchId,
      baseSalary,
      hireDate,
      position,
      department,
      profileImage,
      nationalIdNumber,
      nationalIdFrontImage,
      nationalIdBackImage,
    };
    if (!userId) {
      return next(new AppError("User ID is required", 400));
    }

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return next(new AppError(`${key} is required`, 400));
      }
    }

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId },
    });
    if (!staffProfile) {
      return next(new AppError("Staff Profile not found for this user", 404));
    }
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      return next(new AppError("branch not found", 404));
    }
    const updatedStaffProfile = await prisma.staffProfile.update({
      where: { userId },
      data: {
        branchId,
        baseSalary,
        hireDate: new Date(hireDate),
        position,
        department,
        profileImage,
        nationalId: {
          number: nationalIdNumber,
          frontImage: nationalIdFrontImage,
          backImage: nationalIdBackImage,
        },
      },
    });
    await redisClient.del(`staffProfile:${staffProfile.id}`);
    const cacheKeys = await redisClient.keys("staffProfiles:*");
    if (cacheKeys.length > 0) {
      await redisClient.del(cacheKeys);
    }
    res.status(200).json({
      status: "success",
      data: updatedStaffProfile,
    });
  } catch (error) {
    next(error);
  }
};
