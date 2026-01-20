import "dotenv/config";
import process from "process";
import express from "express";
import { connectDB } from "./configs/db.js";
import helmet from "helmet";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectRedis } from "./configs/redis.js";
import xss from "xss";

const app = express();
app.use(express.json());

const PORT = process.env.PORT;

// database connection
await connectDB();
await connectRedis();

app.set("trust proxy", 1);

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use((req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = xss(obj[key]);
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
});

// Routes
import authRouter from "./routes/auth.js";
import roleRouter from "./routes/role.js";
import userRouter from "./routes/user.js";
import permissionRouter from "./routes/permission.js";
import rolePermissionRouter from "./routes/rolePermission.js";
import businessRouter from "./routes/business.js";
import branchRouter from "./routes/branch.js";
import staffProfileRouter from "./routes/staffProfile.js";

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/permissions", permissionRouter);
app.use("/api/v1/role-permissions", rolePermissionRouter);
app.use("/api/v1/businesses", businessRouter);
app.use("/api/v1/branches", branchRouter);
app.use("/api/v1/staff-profiles", staffProfileRouter);

app.get("/", (req, res) => {
  res.send("Welcome to Spacefy API");
});

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
