import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  deleteAllUsers,
  deleteUserById,
} from "../Controllers/user.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router = Router();

router.get(
  "/getAll",
  verifyToken,
  cacheMiddleware(
    (req) =>
      `users:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${
        req.query.sort || "createdAt"
      }:order=${req.query.order || "desc"}`,
    "USERS_LIST"
  ),
  getAllUsers
);

router.get(
  "/getById/:id",
  verifyToken,
  cacheMiddleware((req) => `user:${req.params.id}`, "USER_DETAIL"),
  getUserById
);
router.delete("/deleteAll", verifyToken, deleteAllUsers);
router.delete("/deleteById/:id", verifyToken, verifyToken, deleteUserById);
export default router;
