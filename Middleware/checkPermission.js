import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { formatPermission } from "../utils/formatPermission.js";

export const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.roleId) {
        return next(
          new AppError(
            "Unauthorized: You must be logged in to access this resource",
            401,
          ),
        );
      }

      const { id: userId, roleId } = req.user;

      const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
      });

      if (!role) {
        return next(new AppError("Role not found", 403));
      }

      if (role.name === "DEVELOPER") {
        return next();
      }

      let hasPermission = null;

      if (role.name === "STAFF") {
        hasPermission = await prisma.UserPermission.findFirst({
          where: {
            userId,
            permission: {
              name: permissionName,
            },
          },
        });
      } else {
        hasPermission = await prisma.RolePermission.findFirst({
          where: {
            roleId,
            permission: {
              name: permissionName,
            },
          },
        });
      }

      const permission = await formatPermission(permissionName);

      if (!hasPermission) {
        return next(
          new AppError(
            `Forbidden: You do not have permission to perform "${permission}"`,
            403,
          ),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
