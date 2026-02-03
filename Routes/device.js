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
} from "../controllers/device.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { checkOwnership } from "../middleware/checkOwnership.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-DEVICES"),
  createDevice,
);
router.get(
  "/getAll/:branchId",
  verifyToken,
  cacheMiddleware(
    (req) =>
      `devices:page=${req.query.page || 1}:limit=${req.query.limit || 10}:branchId=${
        req.params.branchId || "all"
      }:type=${req.query.type || "all"}`,
    "TTL_LIST",
  ),
  checkPermission("VIEW-DEVICES"),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  getAllDevices,
);
router.get(
  "/getById/:deviceId",
  verifyToken,
  cacheMiddleware((req) => `device:${req.params.deviceId}`, "TTL_BY_ID"),
  checkPermission("VIEW-DEVICES"),
  checkOwnership({ model: "device", paramId: "deviceId", scope: "device" }),
  getDeviceById,
);
router.get(
  "/getByType/:branchId/:type",
  verifyToken,
  cacheMiddleware(
    (req) => `devices:branchId=${req.params.branchId}:type=${req.params.type}`,
    "TTL_LIST",
  ),
  checkPermission("VIEW-DEVICES"),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  getDevicesByType,
);
router.get(
  "/getAllByBranchId/:branchId",
  verifyToken,
  cacheMiddleware(
    (req) => `devices:branchId=${req.params.branchId}`,
    "TTL_LIST",
  ),
  checkPermission("VIEW-DEVICES"),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  getAllByBranchId,
);
router.patch(
  "/update/:deviceId",
  verifyToken,
  checkPermission("UPDATE-DEVICES"),
  checkOwnership({ model: "device", paramId: "deviceId", scope: "device" }),
  updateDeviceById,
);
router.delete(
  "/delete/:deviceId",
  verifyToken,
  checkPermission("DELETE-DEVICES"),
  checkOwnership({ model: "device", paramId: "deviceId", scope: "device" }),
  deleteDeviceById,
);
router.delete(
  "/deleteAll/",
  verifyToken,
  checkPermission("DELETE-DEVICES"),
  deleteAllDevices,
);

export default router;
