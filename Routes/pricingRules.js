import { Router } from "express";
import {
  createPricingRule,
  getPricingRuleById,
  getAllPricingRules,
  updatePricingRuleById,
  deletePricingRuleById,
} from "../controllers/pricingRules.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { checkOwnership } from "../middleware/checkOwnership.js";

const router = Router();

router.post(
  "/create/:branchId",
  verifyToken,
  checkPermission("CREATE-PRICING-RULES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  createPricingRule,
);

router.get(
  "/getAll/:branchId",
  verifyToken,
  checkPermission("VIEW-PRICING-RULES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  cacheMiddleware(
    (req) =>
      `pricingRules:${req.params.branchId}:page=${req.query.page || 1}:limit=${req.query.limit || 10}:pricingType=${req.query.pricingType || "all"}:isActive=${req.query.isActive || "all"}:isPackage=${req.query.isPackage || "all"}:spaceId=${req.query.spaceId || "all"}:deviceId=${req.query.deviceId || "all"}:toolId=${req.query.toolId || "all"}`,
    "TTL_LIST",
  ),
  getAllPricingRules,
);

router.get(
  "/getById/:branchId/:pricingRuleId",
  verifyToken,
  checkPermission("VIEW-PRICING-RULES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  cacheMiddleware(
    (req) => `pricingRule:${req.params.pricingRuleId}`,
    "TTL_BY_ID",
  ),
  getPricingRuleById,
);

router.patch(
  "/update/:branchId/:pricingRuleId",
  verifyToken,
  checkPermission("UPDATE-PRICING-RULES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  updatePricingRuleById,
);

router.delete(
  "/delete/:branchId/:pricingRuleId",
  verifyToken,
  checkPermission("DELETE-PRICING-RULES", true),
  checkOwnership({ model: "branch", paramId: "branchId", scope: "branch" }),
  deletePricingRuleById,
);

export default router;
