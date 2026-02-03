import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";

const DeviceType = [
  "PC",
  "LAPTOP",
  "PS4",
  "PS5",
  "XBOX_ONE",
  "XBOX_SERIES_S",
  "XBOX_SERIES_X",
  "NINTENDO_SWITCH",
  "VR_HEADSET",
  "SIMULATOR",
  "TV",
  "PROJECTOR",
  "TABLET",
  "SMART_BOARD",
  "SOUND_SYSTEM",
  "CAMERA",
  "MICROPHONE",
  "OTHER",
];

export const createDevice = async (req, res, next) => {
  try {
    const { branchId, spaceId, type, customTypeLabel, hourlyPrice, isActive } =
      req.body;
    const requiredFields = { branchId, spaceId, type, hourlyPrice };
    for (const i in requiredFields) {
      if (!requiredFields[i]) {
        return next(
          new AppError(
            `${i.charAt(0).toUpperCase() + i.slice(1)} is required`,
            400,
          ),
        );
      }
    }
    if (!DeviceType.includes(type)) {
      return next(new AppError("Invalid device type", 400));
    }
    if (customTypeLabel && type !== "OTHER") {
      return next(
        new AppError("customTypeLabel can only be set when type is OTHER", 400),
      );
    }
    const device = await prisma.device.create({
      data: {
        branchId,
        spaceId,
        type,
        customTypeLabel,
        hourlyPrice,
        isActive: isActive !== undefined ? isActive : true,
      },
    });
    res.status(201).json({ status: "success", data: device });
  } catch (error) {
    next(error);
  }
};

export const getDeviceById = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) {
      return next(new AppError("Device ID is required", 400));
    }
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device || device === 0) {
      return next(new AppError("Device not found", 404));
    }
    res.status(200).json({ status: "success", data: device });
  } catch (error) {
    next(error);
  }
};

export const getAllDevices = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!existingBranch) {
      return next(new AppError("Branch not found", 404));
    }
    const { page, limit, skip, order, sort } = pagination(req);
    const [devices, total] = await prisma.$transaction([
      prisma.device.findMany({
        skip: skip,
        take: limit,
        orderBy: { [sort]: order },
        where: branchId ? { branchId } : {},
      }),
      prisma.device.count({ where: branchId ? { branchId } : {} }),
    ]);
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      status: "success",
      data: devices,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllByBranchId = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { page, limit, skip, order, sort } = pagination(req);
    if (!branchId) {
      return next(new AppError("Branch ID is required", 400));
    }
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!existingBranch || existingBranch === 0) {
      return next(new AppError("Branch not found", 404));
    }
    const [devices, total] = await prisma.$transaction([
      prisma.device.findMany({
        skip: skip,
        take: limit,
        orderBy: { [sort]: order },
        where: { branchId: branchId },
      }),
      prisma.device.count({ where: { branchId: branchId } }),
    ]);
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      status: "success",
      data: devices,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDevicesByType = async (req, res, next) => {
  try {
    let { branchId, type } = req.params;
    if (!branchId || !type) {
      return next(new AppError("Branch ID and Device Type are required", 400));
    }

    type = String(type).toUpperCase();

    if (!DeviceType.includes(type)) {
      return next(new AppError("Invalid device type", 400));
    }
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch || branch === 0) {
      return next(new AppError("Branch not found", 404));
    }

    const devices = await prisma.device.findMany({
      where: { branchId: branchId, type: type },
    });
    res
      .status(200)
      .json({ status: "success", data: devices, source: "database" });
  } catch (error) {
    next(error);
  }
};

export const updateDeviceById = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const allowedUpdates = [
      "type",
      "customTypeLabel",
      "hourlyPrice",
      "isActive",
    ];
    const updates = { ...req.body };
    const isValidOperation = Object.keys(updates).filter((update) =>
      allowedUpdates.includes(update),
    );
    if (!isValidOperation || isValidOperation.length === 0) {
      return next(new AppError("No valid fields to update", 400));
    }
    if (updates.type) {
      if (!DeviceType.includes(updates.type)) {
        return next(new AppError("Invalid device type", 400));
      }
      if (updates.customTypeLabel && updates.type !== "OTHER") {
        return next(
          new AppError(
            "customTypeLabel can only be set when type is OTHER",
            400,
          ),
        );
      }
    }
    if (updates.isActive !== undefined) {
      updates.isActive = Boolean(updates.isActive);
    }
    const existingDevice = await prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!existingDevice || existingDevice === 0) {
      return next(new AppError("Device not found", 404));
    }
    const updatedDevice = await prisma.device.update({
      where: { id: deviceId },
      data: updates,
    });
    res.status(200).json({ status: "success", data: updatedDevice });
  } catch (error) {
    next(error);
  }
};

export const deleteDeviceById = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) {
      return next(new AppError("Device ID is required", 400));
    }
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device || device === 0) {
      return next(new AppError("Device not found", 404));
    }
    await prisma.device.delete({
      where: { id: deviceId },
    });
    res
      .status(200)
      .json({ status: "success", message: "Device deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteAllDevices = async (req, res, next) => {
  try {
    const result = await prisma.device.deleteMany({});
    if (!result || result.count === 0) {
      return next(new AppError("No devices to delete", 404));
    }
    res.status(200).json({
      status: "success",
      message: "All devices deleted successfully",
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
};
