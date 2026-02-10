import { Router } from "express";
import {
  createDevice,
  getAllByBranchId,
  getAllDevices,
  getDeviceById,
  getDevicesByType,
  updateDeviceById,
  deleteDeviceById,
  deleteAllDevices,
  deleteDevicesByBranchId,
} from "../controllers/device.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { checkOwnership } from "../middleware/checkOwnership.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-DEVICES", true),
  createDevice,
);
router.get(
  "/getAll",
  verifyToken,
  checkPermission("VIEW-DEVICES"),
  cacheMiddleware(
    (req) =>
      `devices:page=${req.query.page || 1}:limit=${req.query.limit || 10}:branchId=${
        req.params.branchId || "all"
      }:type=${req.query.type || "all"}`,
    "TTL_LIST",
  ),
  getAllDevices,
);
router.get(
  "/getById/:branchId/:deviceId",
  verifyToken,
  checkPermission("VIEW-DEVICES", true),
  checkOwnership({ model: "device", paramId: "deviceId", scope: "device" }),
  cacheMiddleware((req) => `device:${req.params.deviceId}`, "TTL_BY_ID"),
  getDeviceById,
);
router.get(
  "/getByType/:branchId/:type",
  verifyToken,
  checkPermission("VIEW-DEVICES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  cacheMiddleware(
    (req) => `devices:branchId=${req.params.branchId}:type=${req.params.type}`,
    "TTL_LIST",
  ),
  getDevicesByType,
);
router.get(
  "/getAllByBranchId/:branchId",
  verifyToken,
  checkPermission("VIEW-DEVICES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  cacheMiddleware(
    (req) => `devices:branchId=${req.params.branchId}`,
    "TTL_LIST",
  ),
  getAllByBranchId,
);
router.patch(
  "/update/:branchId/:deviceId",
  verifyToken,
  checkPermission("UPDATE-DEVICES", true),
  checkOwnership({ model: "device", paramId: "deviceId", scope: "device" }),
  updateDeviceById,
);
router.delete(
  "/delete/:branchId/:deviceId",
  verifyToken,
  checkPermission("DELETE-DEVICES", true),
  checkOwnership({ model: "device", paramId: "deviceId", scope: "device" }),
  deleteDeviceById,
);
router.delete(
  "/deleteByBranchId/:branchId",
  verifyToken,
  checkPermission("DELETE-DEVICES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  deleteDevicesByBranchId,
);
router.delete(
  "/deleteAll/",
  verifyToken,
  checkPermission("DELETE-DEVICES"),
  deleteAllDevices,
);

export default router;
