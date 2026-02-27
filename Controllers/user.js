import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";
import { redisClient } from "../configs/redis.js";
import {
  isValidName,
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../utils/validation.js";
import bcrypt from "bcrypt";
import process from "process";

export const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip, sort, order } = pagination(req);

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          role: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count(),
    ]);

    if (!users || users.length === 0) {
      return next(new AppError("No users found", 404));
    }

    const totalPages = Math.ceil(total / limit);

    // eslint-disable-next-line no-unused-vars
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);

    res.status(200).json({
      success: true,
      data: usersWithoutPassword,
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

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // eslint-disable-next-line no-unused-vars
    const userWithoutPassword = (({ password, ...rest }) => rest)(user);

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await prisma.user.delete({ where: { id } });
    } catch (error) {
      if (error.code === "P2025") {
        return next(new AppError("User not found", 404));
      }
      throw error;
    }

    await redisClient.del(`user:${id}`);
    const keys = await redisClient.keys("users:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllUsers = async (req, res, next) => {
  try {
    const result = await prisma.user.deleteMany({});
    if (result.count === 0) {
      return next(new AppError("No users to delete", 404));
    }
    const keys = await redisClient.keys("users:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(200).json({
      status: "success",
      message: "All users deleted successfully",
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return next(new AppError("User ID is required", 400));
    }
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    if (existingUser === 0) {
      return next(new AppError("User not found", 404));
    }
    const allowedFields = ["name", "phone", "email", "password", "roleId"];
    const updateData = { ...req.body };
    if (updateData.password) {
      if (!isValidPassword(updateData.password)) {
        return next(
          new AppError(
            "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
            400,
          ),
        );
      }
      updateData.password = bcrypt.hash(
        updateData.password,
        process.env.SALT_ROUNDS,
      );
    }
    if (updateData.email) {
      if (!isValidEmail(updateData.email)) {
        return next(new AppError("Invalid email format", 400));
      }
      const emailInUse = await prisma.user.findUnique({
        where: { email: updateData.email },
      });
      if (emailInUse && emailInUse.id !== id) {
        return next(
          new AppError("Email is already in use by another user", 409),
        );
      }
    }
    if (updateData.phone) {
      if (!isValidPhone(updateData.phone)) {
        return next(new AppError("Invalid phone format", 400));
      }
    }
    if (updateData.name) {
      if (!isValidName(updateData.name)) {
        return next(new AppError("Invalid name format", 400));
      }
    }
    if (updateData.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: updateData.roleId },
      });
      if (!role) {
        return next(new AppError("Role not found", 404));
      }
      if (
        role.name === "DEVELOPER" ||
        (role.name === "OWNER" && req.user.roleName !== "DEVELOPER")
      ) {
        return next(
          new AppError(
            "Forbidden: Cannot assign DEVELOPER or OWNER role to a user",
            403,
          ),
        );
      }
    }
    const keys = Object.keys(updateData).filter(
      (key) => !allowedFields.includes(key),
    );
    if (keys.length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, name: true } },
      },
    });
    await redisClient.del(`user:${id}`);
    const cacheKeys = await redisClient.keys("users:*");
    if (cacheKeys.length > 0) {
      await redisClient.del(cacheKeys);
    }
    res.status(200).json({
      status: "success",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserByRoleName = async (req, res, next) => {
  try {
    let { roleName } = req.params;
    if (!roleName) {
      return next(new AppError("Role name is required", 400));
    }
    roleName = String(roleName).toUpperCase();
    const { page, limit, skip, sort, order } = pagination(req);
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      return next(new AppError("Role not found", 404));
    }
    const users = await prisma.user.findMany({
      where: { roleId: role.id },
      skip,
      take: limit,
      orderBy: { [sort]: order },
    });
    const total = await prisma.user.count({
      where: { roleId: role.id },
    });
    if (!users.length) {
      return next(new AppError("No users found for this role", 404));
    }
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      data: users,
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

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        businesses: true,
      },
    });
    if (!user) {
      return next(new AppError("User not found", 404));
    }
    // eslint-disable-next-line no-unused-vars
    const userWithoutPassword = (({ password, ...rest }) => rest)(user);
    res.status(200).json({
      success: true,
      data: userWithoutPassword,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};
