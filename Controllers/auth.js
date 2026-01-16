import { prisma } from "../configs/db.js";
import bcrypt from "bcrypt";
import process from "process";
import {
  isValidName,
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../utils/validation.js";
import { AppError } from "../utils/appError.js";
import jwt from "jsonwebtoken";
// import crypto from "crypto";

export const register = async (req, res, next) => {
  try {
    const { name, phone, email, password, role } = req.body;

    const roleId = role || "1f10283e-9ade-48ad-a3a1-80cfd4306d08";

    const requiredFields = { name, phone, email, password, roleId };

    for (let i in requiredFields) {
      if (!requiredFields[i]) {
        return next(
          new AppError(
            `${i.charAt(0).toUpperCase() + i.slice(1)} is required`,
            400
          )
        );
      }
    }

    if (!isValidName(name)) {
      return next(new AppError("Invalid name format", 400));
    }
    if (!isValidEmail(email)) {
      return next(new AppError("Invalid email format", 400));
    }
    if (!isValidPassword(password)) {
      return next(new AppError("Weak password format", 400));
    }
    if (!isValidPhone(phone)) {
      return next(new AppError("Invalid phone format", 400));
    }
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!existingRole) {
      return next(new AppError("Role does not exist", 400));
    }
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return next(new AppError("Email already in use", 409));
    }
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS)
    );

    const newUser = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        roleId,
      },
    });

    // eslint-disable-next-line no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      status: "success",
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const requiredFields = { email, password };
    for (let i in requiredFields) {
      if (!requiredFields[i]) {
        return next(
          new AppError(
            `${i.charAt(0).toUpperCase() + i.slice(1)} is required`,
            400
          )
        );
      }
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return next(new AppError("Invalid email", 401));
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid password", 401));
    }

    // eslint-disable-next-line no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    const roleName = await prisma.role.findUnique({
      where: { id: user.roleId },
    });

    const token = jwt.sign(
      {
        id: user.id,
        roleId: user.roleId,
        roles: roleName.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      status: "success",
      data: userWithoutPassword,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];

    const decoded = jwt.decode(token);

    if (!decoded) {
      return next(new AppError("Invalid token", 401));
    }

    //TODO: make it in v2
    //! const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.blacklistedToken.create({
      data: {
        token,
        expiredAt: decoded.exp ? new Date(decoded.exp * 1000) : new Date(),
      },
    });
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
