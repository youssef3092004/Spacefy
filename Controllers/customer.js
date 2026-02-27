import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";
import {
  isValidName,
  isValidEmail,
  isValidPhone,
} from "../utils/validation.js";
import { messages } from "../locales/message.js";
  
export const createCustomer = async (req, res, next) => {
  try {
    const { businessId, name, phone, email, password } = req.body;
    const requiredFields = { businessId, name, phone };

    for (let i in requiredFields) {
      if (!requiredFields[i]) {
        return next(
          new AppError(
            `${i.charAt(0).toUpperCase() + i.slice(1)} is required`,
            400,
          ),
        );
      }
    }
    const existingBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!existingBusiness) {
      return next(new AppError("Business not found", 404));
    }
    if (!isValidName(name)) {
      return next(new AppError("Invalid name format", 400));
    }

    if (!isValidPhone(phone)) {
      return next(new AppError("Invalid phone format", 400));
    }

    if (email && !isValidEmail(email)) {
      return next(new AppError("Invalid email format", 400));
    }

    const existingPhone = await prisma.customer.findUnique({
      where: { phone },
    });

    if (existingPhone) {
      return next(new AppError("Phone number already in use", 409));
    }

    if (email) {
      const existingEmail = await prisma.customer.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return next(new AppError("Email already in use", 409));
      }
    }

    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { seqNumber: "desc" },
      select: { seqNumber: true },
    });

    const seqNumber = (lastCustomer?.seqNumber || 0) + 1;

    const customer = await prisma.customer.create({
      data: {
        businessId,
        seqNumber,
        name,
        phone,
        email: email || null,
        password: password || null,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new AppError("Customer ID is required", 400));
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    res.status(200).json({
      success: true,
      data: customer,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCustomersBybusinessId = async (req, res, next) => {
  try {
    const { page, limit, skip, sort, order } = pagination(req);
    const { businessId } = req.params;
    if (!businessId) {
      return next(new AppError("Business ID is required", 400));
    }
    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where: {
          businessId,
        },
        skip,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.customer.count({ where: { businessId } }),
    ]);

    if (!customers.length) {
      return next(new AppError("No customers found for this business", 404));
    }

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages,
        sort,
        order,
      },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCustomers = async (req, res, next) => {
  try {
    if (req.user.roleName !== "DEVELOPER") {
      return next(new AppError(messages.FORBIDDEN.en, 403));
    }
    const { page, limit, skip, sort, order } = pagination(req);
    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        skip,
        take: limit,
        orderBy: { [sort]: order },
      }),
      prisma.customer.count(),
    ]);
    if (!customers.length) {
      return next(new AppError("No customers found", 404));
    }
    const totalPages = Math.ceil(total / limit);
    res.status(200).json({
      success: true,
      message: "Customers retrieved successfully",
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages,
        sort,
        order,
      },
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerByIdPatch = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new AppError("Customer ID is required", 400));
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      return next(new AppError("Customer not found", 404));
    }

    const allowedFields = ["name", "phone", "email", "password"];
    const updateData = { ...req.body };

    for (const key of Object.keys(updateData)) {
      if (!allowedFields.includes(key)) {
        return next(new AppError(`Field '${key}' cannot be updated`, 400));
      }
    }

    if (updateData.name && !isValidName(updateData.name)) {
      return next(new AppError("Invalid name format", 400));
    }

    if (updateData.phone && !isValidPhone(updateData.phone)) {
      return next(new AppError("Invalid phone format", 400));
    }

    if (updateData.email && !isValidEmail(updateData.email)) {
      return next(new AppError("Invalid email format", 400));
    }

    if (updateData.phone && updateData.phone !== existingCustomer.phone) {
      const existingPhone = await prisma.customer.findUnique({
        where: { phone: updateData.phone },
      });

      if (existingPhone) {
        return next(new AppError("Phone number already in use", 409));
      }
    }

    if (updateData.email && updateData.email !== existingCustomer.email) {
      const existingEmail = await prisma.customer.findUnique({
        where: { email: updateData.email },
      });

      if (existingEmail) {
        return next(new AppError("Email already in use", 409));
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      data: updatedCustomer,
      source: "database",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomerById = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return next(new AppError("Customer ID is required", 400));
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllCustomers = async (req, res, next) => {
  try {
    if (req.user.roleName !== "DEVELOPER") {
      return next(new AppError(messages.FORBIDDEN.en, 403));
    }

    const deletedCustomers = await prisma.customer.deleteMany({});

    if (deletedCustomers.count === 0) {
      return next(new AppError("No customers to delete", 404));
    }

    res.status(200).json({
      success: true,
      message: "All customers deleted successfully",
      count: deletedCustomers.count,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomersByBusinessId = async (req, res, next) => {
  try {
    if (req.user.roleName !== "DEVELOPER" && req.user.roleName !== "OWNER") {
      return next(new AppError(messages.FORBIDDEN.en, 403));
    }
    const { businessId } = req.params;

    if (!businessId) {
      return next(new AppError("Business ID is required", 400));
    }
    const existingBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!existingBusiness) {
      return next(new AppError("Business not found", 404));
    }
    const deletedCustomers = await prisma.customer.deleteMany({
      where: { businessId },
    });

    if (deletedCustomers.count === 0) {
      return next(
        new AppError("No customers to delete for this business", 404),
      );
    }
    res.status(200).json({
      success: true,
      message: "Customers deleted successfully for the business",
      count: deletedCustomers.count,
    });
  } catch (error) {
    next(error);
  }
};
