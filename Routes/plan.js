import { Router } from "express";
import {
  createPlan,
  getPlanById,
  getAllPlans,
  updatePlanById,
  deletePlanById,
} from "../controllers/plan.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-PLANS"),
  createPlan,
);

router.get(
  "/getAll",
  verifyToken,
  checkPermission("VIEW-PLANS"),
  cacheMiddleware(
    (req) =>
      `plans:page=${req.query.page || 1}:limit=${req.query.limit || 10}:type=${req.query.type || "all"}:isActive=${req.query.isActive || "all"}:isPublic=${req.query.isPublic || "all"}:billingInterval=${req.query.billingInterval || "all"}:sort=${req.query.sort || "createdAt"}:order=${req.query.order || "desc"}`,
    "TTL_LIST",
  ),
  getAllPlans,
);

router.get(
  "/getById/:id",
  verifyToken,
  checkPermission("VIEW-PLANS"),
  cacheMiddleware((req) => `plan:${req.params.id}`, "TTL_BY_ID"),
  getPlanById,
);

router.patch(
  "/update/:id",
  verifyToken,
  checkPermission("UPDATE-PLANS"),
  updatePlanById,
);

router.delete(
  "/delete/:id",
  verifyToken,
  checkPermission("DELETE-PLANS"),
  deletePlanById,
);

export default router;
