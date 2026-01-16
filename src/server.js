import "dotenv/config";
import process from "process";
import express from "express";
import { connectDB } from "../Configs/db.js";
import helmet from "helmet";
import cors from "cors";
import { errorHandler } from "../Middleware/errorHandler.js";
import { connectRedis } from "../Configs/redis.js";

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

// Routes
import authRouter from "../Routes/auth.js";
import roleRouter from "../Routes/role.js";
import userRouter from "../Routes/user.js";

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/roles", roleRouter);
app.use("/api/v1/users", userRouter);

app.get("/", (req, res) => {
  res.send("Welcome to Spacefy API");
});

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
