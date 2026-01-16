import { Router } from "express";
import { createRole } from "../controllers/role.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.post("/create", verifyToken, createRole);

export default router;
