import { Router } from "express";
import { createRole } from "../Controllers/role.js";
import { verifyToken } from "../Middleware/auth.js";

const router = Router();

router.post("/create", verifyToken, createRole);

export default router;
