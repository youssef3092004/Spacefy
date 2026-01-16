import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";

export const createRole = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return next(new AppError("Name and description are required", 400));
    }
    const newRole = await prisma.role.create({
      data: {
        name,
        description,
      },
    });
    res.status(201).json({
      success: true,
      data: newRole,
    });
  } catch (error) {
    next(error);
  }
};
