import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";

export const authorize = (permission) => {
  return async (req, res, next) => {
    try {
      const userRoleId = req.user.roleId;
      if (!userRoleId) {
        return next(new AppError("User role not found", 403));
      }

      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: userRoleId,
          permission: {
            name: permission,
          },
        },
        include: {
          permission: true,
        },
      });

      if (!rolePermission) {
        return next(
          new AppError("You are not allowed to perform this action", 403)
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
