import { Router } from "express";
import {
  createSpace,
  getSpaceById,
  getAllSpaces,
  getSpaceByIsActive,
  getSpacesByType,
  updateSpaceById,
  deleteSpaceById,
  deleteAllSpaces,
} from "../controllers/space.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-SPACES"),
  createSpace,
);
router.get(
  "/getAll/:branchId",
  verifyToken,
  checkPermission("VIEW-SPACES"),
  cacheMiddleware(
    (req) =>
      `spaces:page=${req.query.page || 1}:limit=${req.query.limit || 10}:branchId=${
        req.params.branchId || "all"
      }:type=${req.query.type || "all"}:isActive=${
        req.query.isActive || "all"
      }`,
    "TTL_LIST",
  ),
  getAllSpaces,
);
router.get(
  "/getById/:spaceId",
  verifyToken,
  checkPermission("VIEW-SPACES"),
  cacheMiddleware((req) => `space:${req.params.spaceId}`, "TTL_BY_ID"),
  getSpaceById,
);
router.get(
  "/getByIsActive/:branchId/:isActive",
  verifyToken,
  checkPermission("VIEW-SPACES"),
  cacheMiddleware(
    (req) => `spaces:branchId=${req.params.branchId}:isActive=${req.params.isActive}`,
    "TTL_LIST",
  ),
  getSpaceByIsActive,
);
router.get(
  "/getByType/:branchId/:type",
  verifyToken,
  checkPermission("VIEW-SPACES"),
  cacheMiddleware((req) => `spaces:branchId=${req.params.branchId}:type=${req.params.type}`, "TTL_LIST"),
  getSpacesByType,
);
router.patch(
  "/update/:spaceId",
  verifyToken,
  checkPermission("UPDATE-SPACES"),
  updateSpaceById,
);
router.delete(
  "/delete/:spaceId",
  verifyToken,
  checkPermission("DELETE-SPACES"),
  deleteSpaceById,
);
router.delete(
  "/deleteAll",
  verifyToken,
  checkPermission("DELETE-SPACES"),
  deleteAllSpaces,
);

export default router;
