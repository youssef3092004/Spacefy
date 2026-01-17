import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";

export const checkOwnership = (
  modelName,
  paramId = "id",
  ownerField = "userId",
) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramId];

      if (!req.user || !req.user.id) {
        return next(new AppError("Unauthorized", 401));
      }

      const userId = req.user.id;

      const resource = await prisma[modelName].findUnique({
        where: { id: resourceId },
        select: { [ownerField]: true },
      });

      if (!resource) {
        return next(new AppError("Resource not found", 404));
      }

      if (resource[ownerField] !== userId) {
        if (req.user.roleName !== "DEVELOPER") {
          return next(new AppError("You do not own this resource", 403));
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
