import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";

/**
 * Dynamic ownership middleware
 * @param {string} resourceType - Prisma model name (e.g., 'user', 'business')
 * @param {string} ownerField - field that stores the owner/assigned user or branch id
 */
export const checkOwnership = (resourceType, ownerField = "userId") => {
  return async (req, res, next) => {
    const { id } = req.params;
    const { id: userId, roles, branchId } = req.user; // include branchId if relevant

    // Admin bypass
    if (roles === "ADMIN") return next();

    // Fetch the resource
    const resource = await prisma[resourceType].findUnique({
      where: { id },
    });

    if (!resource) {
      return next(new AppError(`${resourceType} not found`, 404));
    }

    // Dynamic ownership check based on role
    switch (roles) {
      case "OWNER":
        if (resource[ownerField] !== userId) {
          return next(
            new AppError(
              `You cannot access ${resourceType} of another owner`,
              403
            )
          );
        }
        break;

      case "STAFF":
        // Example: only allow staff to manage resources in their branch
        if (resource.branchId !== branchId) {
          return next(
            new AppError(
              `You cannot modify ${resourceType} outside your branch`,
              403
            )
          );
        }
        break;

      case "CUSTOMER":
        if (resource[ownerField] !== userId) {
          return next(
            new AppError(
              `You cannot access other customers' ${resourceType}`,
              403
            )
          );
        }
        break;

      default:
        return next(new AppError("Role not recognized", 403));
    }

    next();
  };
};
