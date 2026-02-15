import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";
import { validatePrice } from "../utils/validation.js";

const PlanTypes = ["FREE", "PRO", "ENTERPRISE"];
const BillingIntervals = ["MONTHLY", "YEARLY"];

const fixType = (type) => {
  if (!PlanTypes.includes(String(type).toUpperCase())) {
    throw new AppError("Invalid plan type", 400);
  }
  return (type = String(type).toUpperCase());
};

export const createPlan = async (req, res, next) => {
  try {
    const {
      name,
      type,
      description,
      price,
      currency,
      billingInterval,
      trialDays,
      isActive,
      isPublic,
      maxBranches,
      maxSpaces,
      maxDevices,
      maxTools,
      maxUsers,
    } = req.body;

    const requiredFields = { name, type, price };
    for (const field in requiredFields) {
      if (!requiredFields[field]) {
        return next(
          new AppError(
            `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
            400,
          ),
        );
      }
    }

    if (!PlanTypes.includes(type)) {
      return next(new AppError("Invalid plan type", 400));
    }

    const numericPrice = validatePrice(price);

    if (billingInterval && !BillingIntervals.includes(billingInterval)) {
      return next(new AppError("Invalid billing interval", 400));
    }

    if (
      trialDays !== undefined &&
      (trialDays < 0 || !Number.isInteger(trialDays))
    ) {
      return next(
        new AppError("Trial days must be a non-negative integer", 400),
      );
    }

    const newPlan = await prisma.plan.create({
      data: {
        name,
        type,
        description,
        price: numericPrice,
        currency: currency || "EGP",
        billingInterval: billingInterval || "MONTHLY",
        trialDays,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        maxBranches,
        maxSpaces,
        maxDevices,
        maxTools,
        maxUsers,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Plan created successfully",
      data: newPlan,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new AppError("Plan ID is required", 400));

    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) return next(new AppError("Plan not found", 404));

    res.status(200).json({
      status: "success",
      data: plan,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPlans = async (req, res, next) => {
  try {
    const { page, limit, skip, order, sort } = pagination(req);
    const { type, isActive, isPublic, billingInterval } = req.query;

    const parseBoolean = (value, field) => {
      if (value === undefined) return undefined;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new AppError(`${field} must be true or false`, 400);
    };

    const parsedIsActive = parseBoolean(isActive, "isActive");
    const parsedIsPublic = parseBoolean(isPublic, "isPublic");

    if (type && !PlanTypes.includes(type)) {
      return next(new AppError("Invalid plan type", 400));
    }

    if (billingInterval && !BillingIntervals.includes(billingInterval)) {
      return next(new AppError("Invalid billing interval", 400));
    }

    const allowedSortFields = ["createdAt", "price", "name"];
    if (!allowedSortFields.includes(sort)) {
      return next(new AppError("Invalid sort field", 400));
    }

    const where = {
      ...(type && { type }),
      ...(parsedIsActive !== undefined && { isActive: parsedIsActive }),
      ...(parsedIsPublic !== undefined && { isPublic: parsedIsPublic }),
      ...(billingInterval && { billingInterval }),
    };

    const [plans, total] = await prisma.$transaction([
      prisma.plan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.plan.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      data: plans,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new AppError("Plan ID is required", 400));

    const allowedUpdates = [
      "name",
      "type",
      "description",
      "price",
      "currency",
      "billingInterval",
      "trialDays",
      "isActive",
      "isPublic",
      "maxBranches",
      "maxSpaces",
      "maxDevices",
      "maxTools",
      "maxUsers",
    ];

    const updates = { ...req.body };
    const validUpdates = Object.keys(updates).filter((update) =>
      allowedUpdates.includes(update),
    );

    if (!validUpdates || validUpdates.length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }

    const sanitizedUpdates = {};
    validUpdates.forEach((field) => {
      sanitizedUpdates[field] = updates[field];
    });

    const existingPlan = await prisma.plan.findUnique({ where: { id } });
    if (!existingPlan) return next(new AppError("Plan not found", 404));

    if (sanitizedUpdates.type && !PlanTypes.includes(sanitizedUpdates.type)) {
      return next(new AppError("Invalid plan type", 400));
    }

    if (
      sanitizedUpdates.billingInterval &&
      !BillingIntervals.includes(sanitizedUpdates.billingInterval)
    ) {
      return next(new AppError("Invalid billing interval", 400));
    }

    if (sanitizedUpdates.price !== undefined) {
      sanitizedUpdates.price = validatePrice(sanitizedUpdates.price);
    }

    if (sanitizedUpdates.trialDays !== undefined) {
      if (
        sanitizedUpdates.trialDays < 0 ||
        !Number.isInteger(sanitizedUpdates.trialDays)
      ) {
        return next(
          new AppError("Trial days must be a non-negative integer", 400),
        );
      }
    }

    if (sanitizedUpdates.isActive !== undefined) {
      sanitizedUpdates.isActive = Boolean(sanitizedUpdates.isActive);
    }

    if (sanitizedUpdates.isPublic !== undefined) {
      sanitizedUpdates.isPublic = Boolean(sanitizedUpdates.isPublic);
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: sanitizedUpdates,
    });

    res.status(200).json({
      status: "success",
      message: "Plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next(new AppError("Plan ID is required", 400));

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return next(new AppError("Plan not found", 404));

    await prisma.plan.delete({ where: { id } });

    res.status(200).json({
      status: "success",
      message: "Plan deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
