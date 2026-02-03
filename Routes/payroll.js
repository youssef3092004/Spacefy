import { Router } from "express";
import {
  createPayroll,
  getPayrollById,
  getPayrollByStaffId,
  getPayrolls,
  getAllPayrollsByStatus,
  getAllPayrollsByMonth,
  getAllPayrollsByYear,
  changeStatusToPaidPayroll,
  changeStatusPayroll,
  deleteAllPayrolls,
} from "../controllers/payroll.js";
import { verifyToken } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { checkPermission } from "../middleware/checkPermission.js";
import { checkOwnership } from "../middleware/checkOwnership.js";

const router = Router();

router.post(
  "/create",
  verifyToken,
  checkPermission("CREATE-PAYROLLS"),
  createPayroll,
);
router.get(
  "/getAll",
  verifyToken,
  checkPermission("VIEW-PAYROLLS"),
  cacheMiddleware(
    (req) =>
      `payrolls:page=${req.query.page || 1}:limit=${req.query.limit || 10}:staffProfileId=${
        req.query.staffProfileId || "all"
      }:status=${req.query.status || "all"}:month=${
        req.query.month || "all"
      }:year=${req.query.year || "all"}`,
    "TTL_LIST",
  ),
  getPayrolls,
);
router.get(
  "/getById/:payrollId",
  verifyToken,
  cacheMiddleware((req) => `payroll:${req.params.payrollId}`, "TTL_BY_ID"),
  checkPermission("VIEW-PAYROLLS"),
  checkOwnership({ model: "payroll", paramId: "payrollId", scope: "payroll" }),
  getPayrollById,
);
router.get(
  "/getByStaffId/:staffId",
  verifyToken,
  cacheMiddleware(
    (req) => `payrolls:staffId=${req.params.staffId}`,
    "TTL_BY_ID",
  ),
  checkPermission("VIEW-PAYROLLS"),
  checkOwnership({ model: "payroll", paramId: "staffId", scope: "payroll" }),
  getPayrollByStaffId,
);
router.get(
  "/getByStatus/:status",
  verifyToken,
  cacheMiddleware((req) => `payrolls:status=${req.params.status}`, "TTL_LIST"),
  checkPermission("VIEW-PAYROLLS"),
  getAllPayrollsByStatus,
);
router.get(
  "/getByMonth/:month",
  verifyToken,
  checkPermission("VIEW-PAYROLLS"),
  cacheMiddleware((req) => `payrolls:month=${req.params.month}`, "TTL_LIST"),
  getAllPayrollsByMonth,
);
router.get(
  "/getByYear/:year",
  verifyToken,
  checkPermission("VIEW-PAYROLLS"),
  cacheMiddleware((req) => `payrolls:year=${req.params.year}`, "TTL_LIST"),
  getAllPayrollsByYear,
);
router.patch(
  "/changeStatusToPaid/:payrollId",
  verifyToken,
  checkPermission("UPDATE-PAYROLLS"),
  changeStatusToPaidPayroll,
);
router.patch(
  "/changeStatus/:payrollId",
  verifyToken,
  checkPermission("UPDATE-PAYROLLS"),
  changeStatusPayroll,
);
router.delete(
  "/deleteAll",
  verifyToken,
  checkPermission("DELETE-PAYROLLS"),
  deleteAllPayrolls,
);

export default router;
