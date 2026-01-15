import { Router } from "express";
import { register, login, logout } from "../Controllers/auth.js";
import { verifyToken } from "../Middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyToken, logout);

export default router;
