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

  { name: "CREATE-PLANS", description: "Create subscription plans" },
  { name: "VIEW-PLANS", description: "View subscription plans" },
  { name: "UPDATE-PLANS", description: "Update subscription plans" },
  { name: "DELETE-PLANS", description: "Delete subscription plans" },
  {
    name: "VIEW-PRIVATE-PLANS",
    description: "View private subscription plans",
  },

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

  { name: "CREATE-PRICING-RULES", description: "Create pricing rules" },
  { name: "VIEW-PRICING-RULES", description: "View pricing rules" },
  { name: "UPDATE-PRICING-RULES", description: "Update pricing rules" },
  { name: "DELETE-PRICING-RULES", description: "Delete pricing rules" },

  { name: "CREATE-STAFF-PROFILES", description: "Create staff profiles" },
  { name: "VIEW-STAFF-PROFILES", description: "View staff profiles" },
  { name: "UPDATE-STAFF-PROFILES", description: "Update staff profiles" },
  { name: "DELETE-STAFF-PROFILES", description: "Delete staff profiles" },

  { name: "CREATE-TOOLS", description: "Create tools" },
  { name: "GET-TOOLS", description: "Get tools" },
  { name: "UPDATE-TOOLS", description: "Update tools" },
  { name: "DELETE-TOOLS", description: "Delete tools" },

  { name: "VIEW-USERS", description: "View users" },
  { name: "UPDATE-USERS", description: "Update users" },
  { name: "DELETE-USERS", description: "Delete users" },

  {
    name: "CREATE-BRANCH-USER-PERMISSIONS",
    description: "Create branch user permissions",
  },
  {
    name: "VIEW-BRANCH-USER-PERMISSIONS",
    description: "View branch user permissions",
  },
  {
    name: "UPDATE-BRANCH-USER-PERMISSIONS",
    description: "Update branch user permissions",
  },
  {
    name: "DELETE-BRANCH-USER-PERMISSIONS",
    description: "Delete branch user permissions",
  },
  { name: "CREATE-USER-PERMISSIONS", description: "Create user permissions" },
  { name: "VIEW-USER-PERMISSIONS", description: "View user permissions" },
  { name: "UPDATE-USER-PERMISSIONS", description: "Update user permissions" },
  { name: "DELETE-USER-PERMISSIONS", description: "Delete user permissions" },
];

const OWNER_PERMISSIONS = [
  // Registration
  "REGISTER-ADMIN",
  "REGISTER-STAFF",

  // Businesses
  "CREATE-BUSINESSES",
  "VIEW-BUSINESSES",
  "UPDATE-BUSINESSES",
  "DELETE-BUSINESSES",

  // Business Settings
  "CREATE-BUSINESS-SETTINGS",
  "VIEW-BUSINESS-SETTINGS",
  "UPDATE-BUSINESS-SETTINGS",
  "DELETE-BUSINESS-SETTINGS",

  // Branches
  "CREATE-BRANCHES",
  "VIEW-BRANCHES",
  "UPDATE-BRANCHES",
  "DELETE-BRANCHES",

  // Devices
  "CREATE-DEVICES",
  "VIEW-DEVICES",
  "UPDATE-DEVICES",
  "DELETE-DEVICES",

  // Spaces
  "CREATE-SPACES",
  "VIEW-SPACES",
  "UPDATE-SPACES",
  "DELETE-SPACES",

  // Tools
  "CREATE-TOOLS",
  "GET-TOOLS",
  "UPDATE-TOOLS",
  "DELETE-TOOLS",

  // Payrolls
  "CREATE-PAYROLLS",
  "VIEW-PAYROLLS",
  "UPDATE-PAYROLLS",
  "DELETE-PAYROLLS",

  // Staff Profiles
  "CREATE-STAFF-PROFILES",
  "VIEW-STAFF-PROFILES",
  "UPDATE-STAFF-PROFILES",
  "DELETE-STAFF-PROFILES",

  // Users
  "VIEW-USERS",
  "UPDATE-USERS",
  "DELETE-USERS",

  // Pricing Rules
  "CREATE-PRICING-RULES",
  "VIEW-PRICING-RULES",
  "UPDATE-PRICING-RULES",
  "DELETE-PRICING-RULES",

  // Plans (Optional – if owner manages subscription)
  "VIEW-PLANS",
  "VIEW-PRIVATE-PLANS",

  // Roles & Permissions (IMPORTANT)
  "CREATE-ROLES",
  "VIEW-ROLES",
  "UPDATE-ROLES",
  "DELETE-ROLES",

  "CREATE-ROLE-PERMISSIONS",
  "VIEW-ROLE-PERMISSIONS",
  "UPDATE-ROLE-PERMISSIONS",
  "DELETE-ROLE-PERMISSIONS",

  "CREATE-USER-PERMISSIONS",
  "VIEW-USER-PERMISSIONS",
  "UPDATE-USER-PERMISSIONS",
  "DELETE-USER-PERMISSIONS",

  "CREATE-BRANCH-USER-PERMISSIONS",
  "VIEW-BRANCH-USER-PERMISSIONS",
  "UPDATE-BRANCH-USER-PERMISSIONS",
  "DELETE-BRANCH-USER-PERMISSIONS",
];

const STAFF_PERMISSIONS = [
  // View branches assigned to them
  "VIEW-BRANCHES",

  // Devices
  "VIEW-DEVICES",

  // Spaces
  "VIEW-SPACES",

  // Tools
  "GET-TOOLS",

  // Pricing Rules (view only)
  "VIEW-PRICING-RULES",

  // Staff profile (self or limited)
  "VIEW-STAFF-PROFILES",
  "UPDATE-STAFF-PROFILES",
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

const assignPermissionsToRole = async (roleName, permissionNames) => {
  try {
    // 1️⃣ Get role
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    // 2️⃣ Get permissions by names
    const permissions = await prisma.permission.findMany({
      where: {
        name: {
          in: permissionNames,
        },
      },
    });

    if (permissions.length !== permissionNames.length) {
      throw new Error("Some permissions were not found");
    }

    // 3️⃣ Create role-permission relations
    const rolePermissionsData = permissions.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    }));

    const result = await prisma.rolePermission.createMany({
      data: rolePermissionsData,
      skipDuplicates: true,
    });

    console.log(`✅ Assigned ${result.count} permissions to role ${roleName}`);
  } catch (error) {
    console.error(error);
  }
};

router.post("/seed", createPermissionsBulk);
router.post("/assign/owner", async (req, res, next) => {
  try {
    await assignPermissionsToRole("OWNER", OWNER_PERMISSIONS);

    res.status(200).json({
      status: "success",
      message: "Owner permissions assigned successfully",
      count: OWNER_PERMISSIONS.length,
    });
  } catch (error) {
    next(error);
  }
});
router.post("/assign/staff", async (req, res, next) => {
  try {
    await assignPermissionsToRole("STAFF", STAFF_PERMISSIONS);

    res.status(200).json({
      status: "success",
      message: "Staff permissions assigned successfully",
      count: STAFF_PERMISSIONS.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
