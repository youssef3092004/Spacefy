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
