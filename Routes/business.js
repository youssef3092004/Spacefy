import { Router } from "express";
import {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusinessById,
  deleteBusinessById,
  deleteAllBusinesses,
} from "../controllers/business.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-BUSINESSES"),
  createBusiness,
);
router.get(
  "/getAll",
  verifyToken,
  checkPermission("VIEW-BUSINESSES"),
  cacheMiddleware(
    (req) =>
      `businesses:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${
        req.query.sort || "createdAt"
      }:order=${req.query.order || "desc"}`,
    "TTL_LIST",
  ),
  getAllBusinesses,
);
router.get(
  "/getById/:id",
  verifyToken,
  checkPermission("VIEW-BUSINESSES"),
  cacheMiddleware((req) => `business:${req.params.id}`, "TTL_BY_ID"),
  getBusinessById,
);
router.put(
  "/update/:id",
  verifyToken,
  checkPermission("UPDATE-BUSINESSES"),
  cacheMiddleware((req) => `business:${req.params.id}`, "TTL_BY_ID"),
  updateBusinessById,
);
router.delete(
  "/deleteById/:id",
  verifyToken,
  checkPermission("DELETE-BUSINESSES"),
  deleteBusinessById,
);
router.delete(
  "/deleteAll",
  verifyToken,
  checkPermission("DELETE-BUSINESSES"),
  deleteAllBusinesses,
);

export default router;
