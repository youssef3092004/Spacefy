import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";

export const hasPermission = async (
  userId,
  roleId,
  roleName,
  permissionName,
  branchId = null,
  next,
) => {
  try {
    // Admin role has all permissions
    if (roleName === "OWNER" || roleName === "DEVELOPER") {
      return true;
    }
    // Check user-specific permissions
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });
    if (!permission) {
      next(new AppError(`Permission ${permissionName} not found`, 404));
      return false;
    }

    if (branchId) {
      const branchUserPermission = await prisma.branchUserPermission.findFirst({
        where: {
          userId,
          branchId,
          permissionId: permission.id,
        },
        select: { isAllowed: true },
      });

      if (branchUserPermission) {
        return branchUserPermission.isAllowed;
      }
    }

    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permissionId: permission.id,
      },
      select: { isAllowed: true },
    });
    if (userPermission) {
      return userPermission.isAllowed;
    }

    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId: permission.id,
      },
    });
    if (rolePermission) {
      return true;
    }
    return false;
  } catch (error) {
    next(error);
  }
};
