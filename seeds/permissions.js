import { prisma } from "../configs/db.js";
import { redisClient } from "../configs/redis.js";
import { Router } from "express";

const router = Router();

const PERMISSIONS = [
  { name: "REGISTER-OWNER", description: "Register business owner" },
  { name: "REGISTER-ADMIN", description: "Register admin user" },
  { name: "REGISTER-STAFF", description: "Register staff user" },

  { name: "CREATE-BRANCHES", description: "Create branches" },
  { name: "VIEW-BRANCHES", description: "View branches" },
  { name: "UPDATE-BRANCHES", description: "Update branches" },
  { name: "DELETE-BRANCHES", description: "Delete branches" },

  { name: "CREATE-BUSINESSES", description: "Create businesses" },
  { name: "VIEW-BUSINESSES", description: "View businesses" },
  { name: "UPDATE-BUSINESSES", description: "Update businesses" },
  { name: "DELETE-BUSINESSES", description: "Delete businesses" },

  { name: "CREATE-BUSINESS-SETTINGS", description: "Create business settings" },
  { name: "VIEW-BUSINESS-SETTINGS", description: "View business settings" },
  { name: "UPDATE-BUSINESS-SETTINGS", description: "Update business settings" },
  { name: "DELETE-BUSINESS-SETTINGS", description: "Delete business settings" },

  { name: "CREATE-DEVICES", description: "Create devices" },
  { name: "VIEW-DEVICES", description: "View devices" },
  { name: "UPDATE-DEVICES", description: "Update devices" },
  { name: "DELETE-DEVICES", description: "Delete devices" },

  { name: "CREATE-PAYROLLS", description: "Create payrolls" },
  { name: "VIEW-PAYROLLS", description: "View payrolls" },
  { name: "UPDATE-PAYROLLS", description: "Update payrolls" },
  { name: "DELETE-PAYROLLS", description: "Delete payrolls" },

  { name: "CREATE-PERMISSIONS", description: "Create permissions" },
  { name: "VIEW-PERMISSIONS", description: "View permissions" },
  { name: "UPDATE-PERMISSIONS", description: "Update permissions" },
  { name: "DELETE-PERMISSIONS", description: "Delete permissions" },

  { name: "CREATE-ROLES", description: "Create roles" },
  { name: "VIEW-ROLES", description: "View roles" },
  { name: "UPDATE-ROLES", description: "Update roles" },
  { name: "DELETE-ROLES", description: "Delete roles" },

  {
    name: "CREATE-ROLE-PERMISSIONS",
    description: "Assign permissions to roles",
  },
  { name: "VIEW-ROLE-PERMISSIONS", description: "View role permissions" },
  { name: "UPDATE-ROLE-PERMISSIONS", description: "Update role permissions" },
  { name: "DELETE-ROLE-PERMISSIONS", description: "Delete role permissions" },

  { name: "CREATE-SPACES", description: "Create spaces" },
  { name: "VIEW-SPACES", description: "View spaces" },
  { name: "UPDATE-SPACES", description: "Update spaces" },
  { name: "DELETE-SPACES", description: "Delete spaces" },

  { name: "CREATE-STAFF-PROFILES", description: "Create staff profiles" },
  { name: "VIEW-STAFF-PROFILES", description: "View staff profiles" },
  { name: "UPDATE-STAFF-PROFILES", description: "Update staff profiles" },
  { name: "DELETE-STAFF-PROFILES", description: "Delete staff profiles" },

  { name: "CREATE-TOOLS", description: "Create tools" },

  { name: "VIEW-USERS", description: "View users" },
  { name: "UPDATE-USERS", description: "Update users" },
  { name: "DELETE-USERS", description: "Delete users" },
];

const createPermissionsBulk = async (req, res, next) => {
  try {
    const result = await prisma.permission.createMany({
      data: PERMISSIONS,
      skipDuplicates: true, // VERY IMPORTANT
    });

    // Clear permissions cache
    const keys = await redisClient.keys("permissions:*");
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.status(201).json({
      status: "success",
      message: "Permissions seeded successfully",
      insertedCount: result.count,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

router.post("/seed", createPermissionsBulk);

export default router;
