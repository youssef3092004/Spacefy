import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  deleteAllUsers,
  deleteUserById,
  updateUserById,
  getUserByRoleName,
} from "../controllers/user.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.get(
  "/getAll",
  verifyToken,
  checkPermission("VIEW-USERS"),
  cacheMiddleware(
    (req) =>
      `users:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${
        req.query.sort || "createdAt"
      }:order=${req.query.order || "desc"}`,
    "TTL_LIST",
  ),
  getAllUsers,
);

router.get(
  "/getById/:id",
  verifyToken,
  checkPermission("VIEW-USERS"),
  cacheMiddleware((req) => `user:${req.params.id}`, "TTL_BY_ID"),
  getUserById,
);
router.delete(
  "/deleteAll",
  verifyToken,
  checkPermission("DELETE-USERS"),
  deleteAllUsers,
);
router.delete(
  "/deleteById/:id",
  verifyToken,
  checkPermission("DELETE-USERS"),
  deleteUserById,
);
router.patch(
  "/update",
  verifyToken,
  checkPermission("UPDATE-USERS"),
  cacheMiddleware((req) => `user:${req.params.id}`, "TTL_BY_ID"),
  updateUserById,
);
router.get(
  "/getByRoleName/:roleName",
  verifyToken,
  checkPermission("VIEW-USERS"),
  cacheMiddleware(
    (req) =>
      `users:roleName=${req.params.roleName}:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${
        req.query.sort || "createdAt"
      }:order=${req.query.order || "desc"}`,
    "TTL_LIST",
  ),
  getUserByRoleName,
);

export default router;
