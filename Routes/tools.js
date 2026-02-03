import { Router } from "express";
import { createTool } from "../controllers/tools.js";
import { verifyToken } from "../middleware/auth.js";
// import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { upload } from "../middleware/multer.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-TOOLS"),
  upload.single("image"),
  createTool,
);

export default router;
