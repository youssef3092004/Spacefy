import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { checkBranchAccess } from "../utils/checkBranchAccess.js";

export const checkOwnership = ({
  model,
  paramId = "id",
  scope = "branch", // "branch" | "user" | "business"
}) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return next(new AppError("Unauthorized", 401));
      }

      const userId = req.user.id;
      const roleName = req.user.roleName;
      const resourceId = req.params[paramId];
      const allowedScopes = ["branch", "user", "business"];

      if (!allowedScopes.includes(scope)) {
        return next(new AppError(`Invalid ownership scope: ${scope}`, 500));
      }

      if (!resourceId) {
        console.log("Missing resource ID in params:", req.params);
        return next(new AppError(`${paramId} is required`, 400));
      }

      // DEVELOPER bypass only
      if (["DEVELOPER"].includes(roleName)) {
        req.resourceId = resourceId;
        return next();
      }

      // Build select object conditionally based on model
      const selectFields =
        model === "branch"
          ? { id: true }
          : model === "business"
            ? { ownerId: true }
            : { userId: true, branchId: true };

      const whereField =
        model === "branch" || model === "business" ? "id" : paramId;

      const resource = await prisma[model].findUnique({
        where: { [whereField]: resourceId },
        select: selectFields,
      });

      if (!resource) {
        return next(new AppError("Resource not found", 404));
      }

      // 🔹 USER ownership
      if (scope === "user") {
        if (!resource.userId || resource.userId !== userId) {
          return next(new AppError("Forbidden", 403));
        }
      }

      // 🔹 BUSINESS ownership
      if (scope === "business") {
        if (!resource.ownerId || resource.ownerId !== userId) {
          return next(new AppError("You do not own this business", 403));
        }
      }

      // 🔹 BRANCH ownership
      if (scope === "branch") {
        // For the branch model itself, check if user has access to this branch
        if (model === "branch") {
          const hasAccess = await checkBranchAccess(
            userId,
            roleName,
            resourceId, // resourceId IS the branchId
            next,
          );

          if (!hasAccess) {
            return next(
              new AppError("You do not have access to this branch", 403),
            );
          }

          req.branchId = resourceId;
        } else {
          // For other resources (device, space, tool), check if they belong to an accessible branch
          if (!resource.branchId) {
            return next(new AppError("Resource has no branch", 400));
          }

          const hasAccess = await checkBranchAccess(
            userId,
            roleName,
            resource.branchId,
            next,
          );

          if (!hasAccess) {
            return next(
              new AppError("You do not have access to this branch", 403),
            );
          }

          req.branchId = resource.branchId;
        }
      }

      req.resourceId = resourceId;
      next();
    } catch (err) {
      next(err);
    }
  };
};
