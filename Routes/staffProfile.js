import { Router } from "express";
import {
  createStaffProfile,
  getAllStaffProfiles,
  getStaffProfileById,
  updateStaffProfileById,
  deleteAllStaffProfiles,
  deleteStaffProfileById,
  getStaffProfilesByBranchId,
  getStaffProfileByUserId,
  getStaffProfilesCount,
  updateStaffProfileByUserId,
} from "../controllers/staffProfile.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-STAFF-PROFILES"),
  createStaffProfile,
);
router.get(
  "/getAll",
  verifyToken,
  checkPermission("VIEW-STAFF-PROFILES"),
  cacheMiddleware(
    (req) =>
      `staffProfiles:page=${req.query.page || 1}:limit=${
        req.query.limit || 10
      }:sort=${req.query.sort || "createdAt"}:order=${
        req.query.order || "desc"
      }`,
    "TTL_LIST",
  ),
  getAllStaffProfiles,
);
router.get(
  "/getById/:id",
  verifyToken,
  checkPermission("VIEW-STAFF-PROFILES"),
  cacheMiddleware((req) => `staffProfile:${req.params.id}`, "TTL_BY_ID"),
  getStaffProfileById,
);
router.get(
  "/getByBranchId/:branchId",
  verifyToken,
  checkPermission("VIEW-STAFF-PROFILES"),
  cacheMiddleware(
    (req) => `staffProfilesBranch:${req.params.branchId}`,
    "TTL_BY_ID",
  ),
  getStaffProfilesByBranchId,
);
router.put(
  "/updateById/:id",
  verifyToken,
  checkPermission("UPDATE-STAFF-PROFILES"),
  updateStaffProfileById,
);
router.delete(
  "/deleteById/:id",
  verifyToken,
  checkPermission("DELETE-STAFF-PROFILES"),
  deleteStaffProfileById,
);
router.delete(
  "/deleteAll",
  verifyToken,
  checkPermission("DELETE-STAFF-PROFILES"),
  deleteAllStaffProfiles,
);
router.get(
  "/getByUserId/:userId",
  verifyToken,
  checkPermission("VIEW-STAFF-PROFILES"),
  cacheMiddleware(
    (req) => `staffProfileUser:${req.params.userId}`,
    "TTL_BY_ID",
  ),
  getStaffProfileByUserId,
);
router.get(
  "/getStaffProfilesCount",
  verifyToken,
  checkPermission("VIEW-STAFF-PROFILES"),
  cacheMiddleware(() => `staffProfilesCount`, "TTL_BY_ID"),
  getStaffProfilesCount,
);
router.put(
  "/updateByUserId/:userId",
  verifyToken,
  checkPermission("UPDATE-STAFF-PROFILES"),
  updateStaffProfileByUserId,
);

export default router;
