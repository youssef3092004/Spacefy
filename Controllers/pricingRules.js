import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";

const PricingType = ["PER_HOUR", "PER_SESSION"];
const TargetFields = ["spaceId", "deviceId", "toolId"];

const ensureSingleTarget = (data) => {
  const targets = TargetFields.filter((field) => data[field]);
  if (targets.length !== 1) {
    throw new AppError(
      "Exactly one target (spaceId, deviceId, toolId) is required",
      400,
    );
  }
  return targets[0];
};

const validateRanges = ({
  minDurationMinutes,
  maxDurationMinutes,
  minPlayers,
  maxPlayers,
}) => {
  if (minDurationMinutes !== undefined && minDurationMinutes < 0) {
    throw new AppError("minDurationMinutes must be >= 0", 400);
  }
  if (maxDurationMinutes !== undefined && maxDurationMinutes < 0) {
    throw new AppError("maxDurationMinutes must be >= 0", 400);
  }
  if (
    minDurationMinutes !== undefined &&
    maxDurationMinutes !== undefined &&
    minDurationMinutes > maxDurationMinutes
  ) {
    throw new AppError(
      "minDurationMinutes cannot exceed maxDurationMinutes",
      400,
    );
  }
  if (minPlayers !== undefined && minPlayers < 0) {
    throw new AppError("minPlayers must be >= 0", 400);
  }
  if (maxPlayers !== undefined && maxPlayers < 0) {
    throw new AppError("maxPlayers must be >= 0", 400);
  }
  if (
    minPlayers !== undefined &&
    maxPlayers !== undefined &&
    minPlayers > maxPlayers
  ) {
    throw new AppError("minPlayers cannot exceed maxPlayers", 400);
  }
};

const validatePrice = (price) => {
  if (price === undefined || price === null) {
    throw new AppError("Price is required", 400);
  }
  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || !Number.isFinite(numericPrice)) {
    throw new AppError("Price must be a valid number", 400);
  }
  if (numericPrice < 0) {
    throw new AppError("Price must be >= 0", 400);
  }
  return numericPrice;
};

const validateTargetOwnership = async (branchId, data) => {
  const targetField = ensureSingleTarget(data);

  if (targetField === "spaceId") {
    const space = await prisma.space.findFirst({
      where: {
        id: data.spaceId,
        branchId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!space) throw new AppError("Space not found for this branch", 404);
  }

  if (targetField === "deviceId") {
    const device = await prisma.device.findFirst({
      where: {
        id: data.deviceId,
        branchId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!device) throw new AppError("Device not found for this branch", 404);
  }

  if (targetField === "toolId") {
    const tool = await prisma.tool.findFirst({
      where: {
        id: data.toolId,
        branchId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!tool) throw new AppError("Tool not found for this branch", 404);
  }

  return targetField;
};

const resolveBranchId = (pricingRule) => {
  return (
    pricingRule?.space?.branchId ||
    pricingRule?.device?.branchId ||
    pricingRule?.tool?.branchId ||
    null
  );
};

export const createPricingRule = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const {
      name,
      pricingType,
      minDurationMinutes,
      maxDurationMinutes,
      minPlayers,
      maxPlayers,
      price,
      currency,
      isActive,
      isPackage,
      spaceId,
      deviceId,
      toolId,
    } = req.body;

    if (!branchId) return next(new AppError("Branch ID is required", 400));
    if (!name) return next(new AppError("Name is required", 400));
    if (!pricingType) return next(new AppError("pricingType is required", 400));
    if (!PricingType.includes(pricingType)) {
      return next(new AppError("Invalid pricingType", 400));
    }

    validateRanges({
      minDurationMinutes,
      maxDurationMinutes,
      minPlayers,
      maxPlayers,
    });
    const numericPrice = validatePrice(price);

    await validateTargetOwnership(branchId, { spaceId, deviceId, toolId });

    const newRule = await prisma.pricingRule.create({
      data: {
        name,
        pricingType,
        minDurationMinutes,
        maxDurationMinutes,
        minPlayers,
        maxPlayers,
        price: numericPrice,
        currency: currency || "EGP",
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isPackage: isPackage !== undefined ? Boolean(isPackage) : false,
        spaceId,
        deviceId,
        toolId,
      },
    });

    res.status(201).json({
      status: "success",
      messages: "Pricing rule created successfully",
      data: newRule,
    });
  } catch (error) {
    next(error);
  }
};

export const getPricingRuleById = async (req, res, next) => {
  try {
    const { branchId, pricingRuleId } = req.params;
    if (!branchId) return next(new AppError("Branch ID is required", 400));
    if (!pricingRuleId)
      return next(new AppError("Pricing rule ID is required", 400));

    const pricingRule = await prisma.pricingRule.findUnique({
      where: { id: pricingRuleId },
      include: {
        space: { select: { branchId: true } },
        device: { select: { branchId: true } },
        tool: { select: { branchId: true } },
      },
    });

    if (!pricingRule) return next(new AppError("Pricing rule not found", 404));

    const ruleBranchId = resolveBranchId(pricingRule);
    if (!ruleBranchId || ruleBranchId !== branchId) {
      return next(
        new AppError(
          "Pricing rule does not belong to the specified branch",
          403,
        ),
      );
    }

    res
      .status(200)
      .json({ status: "success", data: pricingRule, source: "database" });
  } catch (error) {
    next(error);
  }
};

export const getAllPricingRules = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (!branchId) return next(new AppError("Branch ID is required", 400));

    const { page, limit, skip, order, sort } = pagination(req);
    const { spaceId, deviceId, toolId, isActive, isPackage, pricingType } =
      req.query;

    const targetFilters = [spaceId, deviceId, toolId].filter(Boolean);
    if (targetFilters.length > 1) {
      return next(new AppError("Only one target filter is allowed", 400));
    }

    if (pricingType && !PricingType.includes(pricingType)) {
      return next(new AppError("Invalid pricingType", 400));
    }

    const parsedIsActive =
      isActive === undefined ? undefined : String(isActive) === "true";
    if (
      isActive !== undefined &&
      String(isActive) !== "true" &&
      String(isActive) !== "false"
    ) {
      return next(new AppError("isActive must be true or false", 400));
    }

    const parsedIsPackage =
      isPackage === undefined ? undefined : String(isPackage) === "true";
    if (
      isPackage !== undefined &&
      String(isPackage) !== "true" &&
      String(isPackage) !== "false"
    ) {
      return next(new AppError("isPackage must be true or false", 400));
    }

    const where = {
      OR: [
        { space: { branchId } },
        { device: { branchId } },
        { tool: { branchId } },
      ],
      ...(spaceId ? { spaceId } : {}),
      ...(deviceId ? { deviceId } : {}),
      ...(toolId ? { toolId } : {}),
      ...(pricingType ? { pricingType } : {}),
      ...(parsedIsActive !== undefined ? { isActive: parsedIsActive } : {}),
      ...(parsedIsPackage !== undefined ? { isPackage: parsedIsPackage } : {}),
    };

    const [pricingRules, total] = await prisma.$transaction([
      prisma.pricingRule.findMany({
        skip,
        take: limit,
        orderBy: { [sort]: order },
        where,
      }),
      prisma.pricingRule.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      status: "success",
      data: pricingRules,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const updatePricingRuleById = async (req, res, next) => {
  try {
    const { branchId, pricingRuleId } = req.params;
    if (!branchId) return next(new AppError("Branch ID is required", 400));
    if (!pricingRuleId)
      return next(new AppError("Pricing rule ID is required", 400));

    const allowedUpdates = [
      "name",
      "pricingType",
      "minDurationMinutes",
      "maxDurationMinutes",
      "minPlayers",
      "maxPlayers",
      "price",
      "currency",
      "isActive",
      "isPackage",
      "spaceId",
      "deviceId",
      "toolId",
    ];
    const updates = { ...req.body };
    const validUpdates = Object.keys(updates).filter((update) =>
      allowedUpdates.includes(update),
    );
    if (!validUpdates || validUpdates.length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }

    const existingRule = await prisma.pricingRule.findUnique({
      where: { id: pricingRuleId },
      include: {
        space: { select: { branchId: true } },
        device: { select: { branchId: true } },
        tool: { select: { branchId: true } },
      },
    });

    if (!existingRule) {
      return next(new AppError("Pricing rule not found", 404));
    }

    const existingBranchId = resolveBranchId(existingRule);
    if (!existingBranchId || existingBranchId !== branchId) {
      return next(
        new AppError(
          "Pricing rule does not belong to the specified branch",
          403,
        ),
      );
    }

    if (updates.pricingType && !PricingType.includes(updates.pricingType)) {
      return next(new AppError("Invalid pricingType", 400));
    }

    if (updates.price !== undefined) {
      updates.price = validatePrice(updates.price);
    }

    if (updates.isActive !== undefined) {
      updates.isActive = Boolean(updates.isActive);
    }
    if (updates.isPackage !== undefined) {
      updates.isPackage = Boolean(updates.isPackage);
    }

    validateRanges({
      minDurationMinutes:
        updates.minDurationMinutes ?? existingRule.minDurationMinutes,
      maxDurationMinutes:
        updates.maxDurationMinutes ?? existingRule.maxDurationMinutes,
      minPlayers: updates.minPlayers ?? existingRule.minPlayers,
      maxPlayers: updates.maxPlayers ?? existingRule.maxPlayers,
    });

    const targetUpdateRequested = TargetFields.some(
      (field) => field in updates,
    );
    if (targetUpdateRequested) {
      await validateTargetOwnership(branchId, {
        spaceId: updates.spaceId,
        deviceId: updates.deviceId,
        toolId: updates.toolId,
      });
    }

    const updatedRule = await prisma.pricingRule.update({
      where: { id: pricingRuleId },
      data: updates,
    });

    res.status(200).json({ status: "success", data: updatedRule });
  } catch (error) {
    next(error);
  }
};

export const deletePricingRuleById = async (req, res, next) => {
  try {
    const { branchId, pricingRuleId } = req.params;
    if (!branchId) return next(new AppError("Branch ID is required", 400));
    if (!pricingRuleId)
      return next(new AppError("Pricing rule ID is required", 400));

    const pricingRule = await prisma.pricingRule.findUnique({
      where: { id: pricingRuleId },
      include: {
        space: { select: { branchId: true } },
        device: { select: { branchId: true } },
        tool: { select: { branchId: true } },
      },
    });

    if (!pricingRule) {
      return next(new AppError("Pricing rule not found", 404));
    }

    const ruleBranchId = resolveBranchId(pricingRule);
    if (!ruleBranchId || ruleBranchId !== branchId) {
      return next(
        new AppError(
          "Pricing rule does not belong to the specified branch",
          403,
        ),
      );
    }

    await prisma.pricingRule.delete({ where: { id: pricingRuleId } });

    res.status(200).json({
      status: "success",
      message: "Pricing rule deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
