import { Router } from "express";
import {
  registerOwner,
  registerAdmin,
  registerStaff,
  registerDeveloper,
  login,
  logout,
  forgetPassword,
} from "../controllers/auth.js";
import { verifyToken } from "../middleware/auth.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.post(
  "/registerOwner",
  verifyToken,
  checkPermission("REGISTER-OWNER"),
  registerOwner,
);
router.post(
  "/registerAdmin",
  verifyToken,
  checkPermission("REGISTER-ADMIN"),
  registerAdmin,
);
router.post(
  "/registerStaff",
  verifyToken,
  checkPermission("REGISTER-STAFF"),
  registerStaff,
);
router.post(
  "/registerDeveloper",
  checkPermission("REGISTER-DEVELOPER"),
  registerDeveloper,
);
router.post("/login", login);
router.post("/logout", verifyToken, logout);
router.post("/changePassword/:id", verifyToken, forgetPassword);

export default router;
