import { Router } from "express";
import {
  createBranch,
  getAllBranches,
  getBranchById,
  getBranchesByBusinessId,
  updateBranchById,
  deleteBranchById,
  deleteAllBranches,
} from "../controllers/branch.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-BRANCHES"),
  createBranch,
);
router.get(
  "/getAll",
  verifyToken,
  checkPermission("VIEW-BRANCHES"),
  cacheMiddleware(
    (req) =>
      `branches:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${
        req.query.sort || "createdAt"
      }:order=${req.query.order || "desc"}`,
    "TTL_LIST",
  ),
  getAllBranches,
);
router.get(
  "/getById/:id",
  verifyToken,
  checkPermission("VIEW-BRANCHES"),
  cacheMiddleware((req) => `branch:${req.params.id}`, "TTL_BY_ID"),
  getBranchById,
);
router.get(
  "/getByBusinessId/:businessId",
  verifyToken,
  checkPermission("VIEW-BRANCHES"),
  cacheMiddleware(
    (req) => `branchesBusiness:${req.params.businessId}`,
    "TTL_BY_ID",
  ),
  getBranchesByBusinessId,
);
router.put(
  "/update/:id",
  verifyToken,
  checkPermission("UPDATE-BRANCHES"),
  updateBranchById,
);
router.delete(
  "/deleteById/:id",
  verifyToken,
  checkPermission("DELETE-BRANCHES"),
  deleteBranchById,
);
router.delete(
  "/deleteAll",
  verifyToken,
  checkPermission("DELETE-BRANCHES"),
  deleteAllBranches,
);

export default router;
