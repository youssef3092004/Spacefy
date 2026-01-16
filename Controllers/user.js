import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";
import { redisClient } from "../configs/redis.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip, sort, order } = pagination(req);
    const allowedSortFields = ["createdAt", "email"];
    const allowedOrder = ["asc", "desc"];

    if (!allowedSortFields.includes(sort)) {
      return next(new AppError("Invalid sort field"));
    }
    if (!allowedOrder.includes(order.toLowerCase())) {
      return next(new AppError("Invalid order, must be 'asc' or 'desc'"));
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { [sort]: order },
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
