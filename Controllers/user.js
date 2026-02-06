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
import { messages } from "../locales/message.js";

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
      return next(new AppError(messages.USERS_NOT_FOUND.en, 404));
    }

    const totalPages = Math.ceil(total / limit);

    // eslint-disable-next-line no-unused-vars
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);

    res.status(200).json({
      success: true,
      message: messages.DATA_FOUND_SUCCESSFULLY,
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
      return next(new AppError(messages.USER_NOT_FOUND.en, 404));
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
        return next(new AppError(messages.USER_NOT_FOUND.en, 404));
      }
      throw error;
    }

    await redisClient.del(`user:${id}`);
    const keys = await redisClient.keys("users:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.status(200).json({
      success: true,
      message: messages.DATA_DELETED_SUCCESSFULLY.en,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllUsers = async (req, res, next) => {
  try {
    const result = await prisma.user.deleteMany({});
    if (result.count === 0) {
      return next(new AppError(messages.USERS_NOT_FOUND.en, 404));
    }
    const keys = await redisClient.keys("users:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    res.status(200).json({
      success: true,
      message: messages.DATA_DELETED_SUCCESSFULLY,
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
        return next(new AppError(messages.WEAK_PASSWORD_FORMAT.en, 400));
      }
      updateData.password = bcrypt.hash(
        updateData.password,
        process.env.SALT_ROUNDS,
      );
    }
    if (updateData.email) {
      if (!isValidEmail(updateData.email)) {
        return next(new AppError(messages.INVALID_EMAIL_FORMAT.en, 400));
      }
      const emailInUse = await prisma.user.findUnique({
        where: { email: updateData.email },
      });
      if (emailInUse && emailInUse.id !== id) {
        return next(new AppError(messages.EMAIL_EXISTS.en, 409));
      }
    }
    if (updateData.phone) {
      if (!isValidPhone(updateData.phone)) {
        return next(new AppError(messages.INVALID_PHONE_FORMAT.en, 400));
      }
    }
    if (updateData.name) {
      if (!isValidName(updateData.name)) {
        return next(new AppError(messages.INVALID_NAME_FORMAT.en, 400));
      }
    }
    if (updateData.roleId) {
      const role = await prisma.role.findUnique({
        where: { id: updateData.roleId },
      });
      if (!role) {
        return next(new AppError(messages.ROLE_DOES_NOT_EXIST.en, 404));
      }
      if (
        role.name === "DEVELOPER" ||
        (role.name === "OWNER" && req.user.roleName !== "DEVELOPER")
      ) {
        return next(new AppError(messages.FORBIDDEN.en, 403));
      }
    }
    const keys = Object.keys(updateData).filter(
      (key) => !allowedFields.includes(key),
    );
    if (keys.length === 0) {
      return next(new AppError(messages.NO_VALID_FIELDS_TO_UPDATE.en, 400));
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
      success: true,
      message: messages.DATA_UPDATED_SUCCESSFULLY,
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
      return next(new AppError(messages.ROLE_REQUIRED.en, 400));
    }
    roleName = String(roleName).toUpperCase();
    const { page, limit, skip, sort, order } = pagination(req);
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      return next(new AppError(messages.ROLE_DOES_NOT_EXIST.en, 404));
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
      return next(new AppError(messages.USERS_NOT_FOUND.en, 404));
    }
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      message: messages.DATA_FOUND_SUCCESSFULLY,
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
      return next(new AppError(messages.USER_NOT_FOUND.en, 404));
    }
    // eslint-disable-next-line no-unused-vars
    const userWithoutPassword = (({ password, ...rest }) => rest)(user);
    res.status(200).json({
      success: true,
      message: messages.DATA_FOUND_SUCCESSFULLY,
      data: userWithoutPassword,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};
