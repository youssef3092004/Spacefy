import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";
import { validatePrice } from "../utils/validation.js";

const PricingType = ["PER_HOUR", "PER_SESSION"];
const TargetFields = ["spaceId", "deviceId", "toolId"];
const TargetModels = ["space", "device", "tool"];

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
    if (!branchId) return next(new AppError("Branch ID is required", 400));
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!branch) return next(new AppError("Branch not found", 404));
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

    const requiredFields = {
      name,
      pricingType,
      minDurationMinutes,
      maxDurationMinutes,
      minPlayers,
      maxPlayers,
      price,
    };

    for (let i in requiredFields) {
      if (!requiredFields[i]) {
        return next(
          new AppError(
            `${i.charAt(0).toUpperCase() + i.slice(1)} is required`,
            400,
          ),
        );
      }
    }

    validateRanges({
      minDurationMinutes,
      maxDurationMinutes,
      minPlayers,
      maxPlayers,
    });
    const numericPrice = validatePrice(price);

    await validateTargetOwnership(branchId, { spaceId, deviceId, toolId });

    const existingRule = await prisma.pricingRule.findFirst({
      where: {
        OR: [{ spaceId }, { deviceId }, { toolId }],
        name,
        space: spaceId ? { branchId } : undefined,
        device: deviceId ? { branchId } : undefined,
        tool: toolId ? { branchId } : undefined,
      },
    });
    if (existingRule) {
      return next(
        new AppError(
          "A pricing rule with the same name already exists for this target",
          400,
        ),
      );
    }

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

export const getPriceingRulesByTarget = async (req, res, next) => {
  try {
    const { branchId, target, targetId } = req.params;

    if (!branchId) return next(new AppError("Branch ID is required", 400));
    if (!target || !targetId)
      return next(new AppError("Target and target ID are required", 400));

    if (!TargetModels.includes(target)) {
      return next(new AppError("Invalid target type", 400));
    }

    const existingTarget = await prisma[target].findFirst({
      where: {
        id: targetId,
        branchId,
      },
    });
    if (!existingTarget) {
      return next(new AppError("Target not found or not accessible", 404));
    }
    const includeObj = {
      space: target === "space" ? { select: { branchId: true } } : false,
      device: target === "device" ? { select: { branchId: true } } : false,
      tool: target === "tool" ? { select: { branchId: true } } : false,
    };

    const pricingRules = await prisma.pricingRule.findMany({
      where: {
        [target + "Id"]: targetId,
      },
      include: includeObj,
    });
    if (!pricingRules || pricingRules.length === 0) {
      return next(new AppError("No pricing rules found for this target", 404));
    }

    // Verify each rule belongs to the correct branch
    for (const rule of pricingRules) {
      const ruleBranchId = resolveBranchId(rule);
      if (!ruleBranchId || ruleBranchId !== branchId) {
        return next(
          new AppError(
            "Pricing rule does not belong to the specified branch",
            403,
          ),
        );
      }
    }
    res.status(200).json({
      status: "success",
      message: "Pricing rules retrieved successfully",
      data: pricingRules,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPricingRules = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }

    const { page, limit, skip, order, sort } = pagination(req);
    const { spaceId, deviceId, toolId, isActive, isPackage, pricingType } =
      req.query;

    const targets = [spaceId, deviceId, toolId].filter(Boolean);
    if (targets.length > 1) {
      return next(new AppError("Only one target filter allowed", 400));
    }

    const parseBoolean = (value, field) => {
      if (value === undefined) return undefined;
      if (value === "true") return true;
      if (value === "false") return false;
      throw new AppError(`${field} must be true or false`, 400);
    };

    const parsedIsActive = parseBoolean(isActive, "isActive");
    const parsedIsPackage = parseBoolean(isPackage, "isPackage");

    if (pricingType && !Object.values(PricingType).includes(pricingType)) {
      return next(new AppError("Invalid pricingType", 400));
    }

    const allowedSortFields = ["createdAt", "price", "name"];
    if (!allowedSortFields.includes(sort)) {
      return next(new AppError("Invalid sort field", 400));
    }

    const baseFilters = {
      ...(pricingType && { pricingType }),
      ...(parsedIsActive !== undefined && { isActive: parsedIsActive }),
      ...(parsedIsPackage !== undefined && { isPackage: parsedIsPackage }),
    };

    // 🚀 OPTIMIZED STRATEGY:
    // If target specified → no OR
    let where;

    if (spaceId) {
      where = {
        spaceId,
        ...baseFilters,
        space: { branchId },
      };
    } else if (deviceId) {
      where = {
        deviceId,
        ...baseFilters,
        device: { branchId },
      };
    } else if (toolId) {
      where = {
        toolId,
        ...baseFilters,
        tool: { branchId },
      };
    } else {
      // Only use OR if absolutely needed
      where = {
        OR: [
          { space: { branchId } },
          { device: { branchId } },
          { tool: { branchId } },
        ],
        ...baseFilters,
      };
    }

    const [pricingRules, total] = await prisma.$transaction([
      prisma.pricingRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.pricingRule.count({ where }),
    ]);

    res.status(200).json({
      status: "success",
      data: pricingRules,
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

    const sanitizedUpdates = {};
    validUpdates.forEach((field) => {
      sanitizedUpdates[field] = updates[field];
    });

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

export const updatePricingByTarget = async (req, res, next) => {
  try {
    const { branchId, target, targetId } = req.params;
    if (!branchId) return next(new AppError("Branch ID is required", 400));
    if (!target || !targetId) {
      return next(new AppError("Target and target ID are required", 400));
    }

    if (!TargetModels.includes(target)) {
      return next(new AppError("Invalid target type", 400));
    }

    const targetField = `${target}Id`;
    const targetFilter = { [targetField]: targetId };

    const targetExists = await prisma[target].findFirst({
      where: {
        id: targetId,
        branchId,
        ...(target === "tool" ? { deletedAt: null } : { isActive: true }),
      },
      select: { id: true },
    });
    if (!targetExists) {
      return next(new AppError("Target not found or not accessible", 404));
    }

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

    if (
      sanitizedUpdates.pricingType &&
      !PricingType.includes(sanitizedUpdates.pricingType)
    ) {
      return next(new AppError("Invalid pricingType", 400));
    }

    if (sanitizedUpdates.price !== undefined) {
      sanitizedUpdates.price = validatePrice(sanitizedUpdates.price);
    }

    if (sanitizedUpdates.isActive !== undefined) {
      sanitizedUpdates.isActive = Boolean(sanitizedUpdates.isActive);
    }
    if (sanitizedUpdates.isPackage !== undefined) {
      sanitizedUpdates.isPackage = Boolean(sanitizedUpdates.isPackage);
    }

    validateRanges({
      minDurationMinutes: sanitizedUpdates.minDurationMinutes,
      maxDurationMinutes: sanitizedUpdates.maxDurationMinutes,
      minPlayers: sanitizedUpdates.minPlayers,
      maxPlayers: sanitizedUpdates.maxPlayers,
    });

    const updateResult = await prisma.pricingRule.updateMany({
      where: targetFilter,
      data: sanitizedUpdates,
    });

    if (!updateResult || updateResult.count === 0) {
      return next(new AppError("No pricing rules found for this target", 404));
    }

    const updatedRules = await prisma.pricingRule.findMany({
      where: targetFilter,
    });

    res.status(200).json({
      status: "success",
      message: "Pricing rules updated successfully",
      data: updatedRules,
      meta: { updated: updateResult.count },
    });
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

export const deletePricingRuleByTarget = async (req, res, next) => {
  try {
    const { branchId, target, targetId } = req.params;
    if (!branchId) return next(new AppError("Branch ID is required", 400));
    if (!target || !targetId) {
      return next(new AppError("Target and target ID are required", 400));
    }

    if (!TargetModels.includes(target)) {
      return next(new AppError("Invalid target type", 400));
    }

    const targetField = `${target}Id`;
    const targetFilter = { [targetField]: targetId };

    const targetExists = await prisma[target].findFirst({
      where: {
        id: targetId,
        branchId,
        ...(target === "tool" ? { deletedAt: null } : { isActive: true }),
      },
      select: { id: true },
    });
    if (!targetExists) {
      return next(new AppError("Target not found or not accessible", 404));
    }

    const deleteResult = await prisma.pricingRule.deleteMany({
      where: targetFilter,
    });

    if (!deleteResult || deleteResult.count === 0) {
      return next(new AppError("No pricing rules found for this target", 404));
    }

    res.status(200).json({
      status: "success",
      message: "Pricing rules deleted successfully",
      meta: { deleted: deleteResult.count },
    });
  } catch (error) {
    next(error);
  }
};
