/* eslint-disable no-unused-vars */
import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { compressAndUpload } from "../utils/cloudinary.js";

export const createTool = async (req, res, next) => {
  try {
    const { branchId, name, pricePerSession, isActive } = req.body;

    if (!branchId) return next(new AppError("BranchId is required", 400));
    if (!name) return next(new AppError("Name is required", 400));
    if (pricePerSession === undefined)
      return next(new AppError("Price per session is required", 400));

    if (isNaN(Number(pricePerSession)) || Number(pricePerSession) < 0) {
      return next(
        new AppError("Price per session must be a positive number", 400),
      );
    }

    const active = isActive !== undefined ? Boolean(isActive) : true;

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) return next(new AppError("Branch not found", 404));

    let imageUrl =
      "https://media.istockphoto.com/id/1472933890/vector/no-image-vector-symbol-missing-available-icon-no-gallery-for-this-moment-placeholder.jpg?s=2048x2048&w=is&k=20&c=Qw0wGz-a6BpwFjaoxtkjgsf75C-DeOYs7GFPU8O9z20=";

    if (req.file) {
      try {
        const uploadResult = await compressAndUpload(req.file.buffer, "tools");
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        return next(new AppError("Failed to upload image", 500));
      }
    }

    const newTool = await prisma.tool.create({
      data: {
        branchId,
        name,
        pricePerSession: Number(pricePerSession),
        isActive: active,
        image: imageUrl,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      status: "success",
      data: newTool,
    });
  } catch (error) {
    next(error);
  }
};

export const getToolById = async (req, res, next) => {
  try {
    const { branchId, toolId } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    if (!toolId) {
      return next(new AppError("Tool ID is required", 400));
    }

    const tool = await prisma.tool.findFirst({
      where: { id: toolId, branchId, deletedAt: null },
    });
    if (!tool || tool.length === 0)
      return next(new AppError("Tool not found", 404));

    if (tool.branchId !== branchId) {
      return next(
        new AppError("Tool does not belong to the specified branch", 400),
      );
    }
    res.status(200).json({
      status: "success",
      data: tool,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getToolsByBranchId = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    const tools = await prisma.tool.findMany({
      where: { branchId, deletedAt: null },
    });
    if (!tools || tools.length === 0) {
      return next(new AppError("No tools found for this branch", 404));
    }
    res.status(200).json({
      status: "success",
      data: tools,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getToolsByIsActive = async (req, res, next) => {
  try {
    const { branchId, isActive } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    if (isActive === undefined) {
      return next(new AppError("isActive parameter is required", 400));
    }
    if (isActive !== true && isActive !== false) {
      return next(new AppError("isActive must be true or false", 400));
    }
    const isActiveBool = isActive === true;
    const tools = await prisma.tool.findMany({
      where: { branchId, isActive: isActiveBool, deletedAt: null },
    });
    if (!tools || tools.length === 0) {
      return next(
        new AppError("No tools found with the specified isActive status", 404),
      );
    }
    res.status(200).json({
      status: "success",
      data: tools,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteToolById = async (req, res, next) => {
  try {
    const { branchId, toolId } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    if (!toolId) {
      return next(new AppError("Tool ID is required", 400));
    }
    const tool = await prisma.tool.findFirst({
      where: { id: toolId, branchId, deletedAt: null },
    });
    if (!tool || tool.length === 0)
      return next(new AppError("Tool not found", 404));

    if (tool.branchId !== branchId) {
      return next(
        new AppError("Tool does not belong to the specified branch", 400),
      );
    }
    await prisma.tool.update({
      where: { id: toolId },
      data: { deletedAt: new Date() },
    });
    res.status(200).json({
      status: "success",
      message: "Tool deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteToolsByBranchId = async (req, res, next) => {
  try {
    if (req.user.roleName !== "DEVELOPER" && req.user.roleName !== "OWNER") {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    const { branchId } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    const tools = await prisma.tool.findMany({
      where: { branchId, deletedAt: null },
    });
    if (!tools || tools.length === 0) {
      return next(new AppError("No tools found for this branch", 404));
    }
    await prisma.tool.updateMany({
      where: { branchId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    res.status(200).json({
      status: "success",
      message: "Tools deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllTools = async (req, res, next) => {
  try {
    if (req.user.roleName !== "DEVELOPER") {
      await prisma.tool.updateMany({
        where: { deletedAt: null },
        data: { deletedAt: new Date() },
      });
      res.status(200).json({
        status: "success",
        message: "All tools deleted successfully",
      });
    }
  } catch (error) {
    next(error);
  }
};

// export const updateTooleById = async (req, res, next) => {
//   try {
//     const { branchId, toolId } = req.params;
//     const allowedUpdates = ["name", "pricePerSession", "isActive"];
//     const updates = Object.keys(req.body);
//     const isValidOperation = updates.every((update) =>
//       allowedUpdates.includes(update),
//     );
//     if (!isValidOperation) {
//       return next(
//         new AppError(
//           `Invalid updates! Allowed fields: ${allowedUpdates.join(", ")}`,
//           400,
//         ),
//       );
//     }
//     if (!branchId) {
//       return next(new AppError("Branch ID is required", 400));
//     }
//     if (!toolId) {
//       return next(new AppError("Tool ID is required", 400));
//     }
//     const tool = await prisma.tool.findFirst({
//       where: { id: toolId, branchId, deletedAt: null },
//     });
//     if (!tool || tool.length === 0)
//       return next(new AppError("Tool not found", 404));

//     if (tool.branchId !== branchId) {
//       return next(
//         new AppError("Tool does not belong to the specified branch", 400),
//       );
//     }
//     const updatedData = {};
//     if (req.body.name !== undefined) updatedData.name = req.body.name;
//     if (req.body.pricePerSession !== undefined) {
//       if (isNaN(Number(req.body.pricePerSession)) || Number(req.body.pricePerSession) < 0) {
//         return next(
//           new AppError("Price per session must be a positive number", 400),
//         );
//       }

//   } catch (error) {
//     next(error);
//   }
// };
