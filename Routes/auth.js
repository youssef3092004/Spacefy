import { Router } from "express";
import {
  registerOwner,
  registerAdmin,
  registerStaff,
  registerDeveloper,
  login,
  logout,
} from "../controllers/auth.js";
import { verifyToken } from "../middleware/auth.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = Router();

router.post("/registerOwner", checkPermission("REGISTER-OWNER"), registerOwner);
router.post("/registerAdmin", checkPermission("REGISTER-ADMIN"), registerAdmin);
router.post("/registerStaff", checkPermission("REGISTER-STAFF"), registerStaff);
router.post(
  "/registerDeveloper",
  checkPermission("REGISTER-DEVELOPER"),
  registerDeveloper,
);
router.post("/login", login);
router.post("/logout", verifyToken, logout);

export default router;
