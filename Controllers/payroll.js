import { prisma } from "../configs/db.js";
import { AppError } from "../utils/appError.js";
import { pagination } from "../utils/pagination.js";

export const createPayroll = async (req, res, next) => {
  try {
    const {
      staffProfileId,
      bonus = 0,
      overtime = 0,
      deductions = 0,
      method,
      month,
      year,
    } = req.body;
    const requiredFields = { staffProfileId, method, month, year };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (value === undefined || value === null) {
        return next(new AppError(`${field} is required`, 400));
      }
    }
    if (bonus < 0 || overtime < 0 || deductions < 0) {
      return next(new AppError("Salary components cannot be negative", 400));
    }
    if (month < 1 || month > 12) {
      return next(new AppError("Month must be between 1 and 12", 400));
    }

    if (year < 2000 || year > new Date().getFullYear() + 1) {
      return next(new AppError("Invalid year", 400));
    }
    if (!["CASH", "BANK", "INSTAPAY", "CARD"].includes(method)) {
      return next(new AppError("Invalid payment method", 400));
    }

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { id: staffProfileId },
    });
    if (!staffProfile) {
      return next(new AppError("Staff profile not found", 404));
    }

    const baseSalary = staffProfile.baseSalary;
    const calculatedGrossSalary =
      parseFloat(baseSalary) + parseFloat(bonus) + parseFloat(overtime);
    const calculatedNetSalary = calculatedGrossSalary - parseFloat(deductions);
    const newPayroll = await prisma.payroll.create({
      data: {
        staffProfileId,
        grossSalary: calculatedGrossSalary,
        bonus,
        overtime,
        deductions,
        netSalary: calculatedNetSalary,
        method,
        month,
        year,
      },
    });
    res.status(201).json({ status: "success", data: newPayroll });
  } catch (error) {
    next(error);
  }
};

export const changeStatusPayroll = async (req, res, next) => {
  try {
    const { payrollId } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return next(new AppError("Invalid status value", 400));
    }

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
    });
    if (!payroll) {
      return next(new AppError("Payroll record not found", 404));
    }
    if (payroll.status !== "PENDING" || payroll.status === "PAID") {
      return next(
        new AppError(
          "Only pending or paid payrolls can be approved or rejected",
          400,
        ),
      );
    }

    const updatedPayroll = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: status,
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
    });
    res.status(200).json({ status: "success", data: updatedPayroll });
  } catch (error) {
    next(error);
  }
};

export const changeStatusToPaidPayroll = async (req, res, next) => {
  try {
    const { payrollId } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
    });
    if (!payroll) {
      return next(new AppError("Payroll record not found", 404));
    }
    if (payroll.status !== "APPROVED") {
      return next(
        new AppError("Only approved payrolls can be marked as paid", 400),
      );
    }
    const updatedPayroll = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    //! Here you might want to integrate with an actual payment gateway & make the expenses record

    res.status(200).json({ status: "success", data: updatedPayroll });
  } catch (error) {
    next(error);
  }
};

export const getPayrollById = async (req, res, next) => {
  try {
    const { payrollId } = req.params;
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
    });
    if (!payroll) {
      return next(new AppError("Payroll record not found", 404));
    }
    res
      .status(200)
      .json({ status: "success", data: payroll, source: "database" });
  } catch (error) {
    next(error);
  }
};

export const getPayrollByStaffId = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: staffId },
    });
    if (!staffProfile) {
      return next(new AppError("Staff profile not found", 404));
    }
    const payroll = await prisma.payroll.findMany({
      where: { staffProfileId: staffProfile.id },
      orderBy: { createdAt: "desc" },
    });
    res
      .status(200)
      .json({ status: "success", data: payroll, source: "database" });
  } catch (error) {
    next(error);
  }
};

export const getPayrolls = async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req);
    //! fix the filters as a many endpoints
    const { status, month, year } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    const totalRecords = await prisma.payroll.count({});
    const payrolls = await prisma.payroll.findMany({
      where: filter,
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({
      status: "success",
      data: payrolls,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollsByStaffId = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const { page, limit, skip, order, sort } = pagination(req);
    if (!staffId) {
      return next(new AppError("Staff ID is required", 400));
    }
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: staffId },
    });
    if (!staffProfile) {
      return next(new AppError("Staff profile not found", 404));
    }
    const [payrolls, total] = await prisma.$transaction([
      prisma.payroll.findMany({
        where: { staffProfileId: staffProfile.id },
        orderBy: { [order]: sort },
        skip: skip,
        take: limit,
      }),
      prisma.payroll.count({
        where: { staffProfileId: staffProfile.id },
      }),
    ]);
    if (!payrolls || payrolls.length === 0) {
      return next(
        new AppError("No payrolls found for the given staff ID", 404),
      );
    }
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    res.status(200).json({
      status: "success",
      data: payrolls,
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

export const getAllPayrollsByStatus = async (req, res, next) => {
  try {
    let { status } = req.params;
    status = String(status).toUpperCase();
    const { page, limit, skip, order, sort } = pagination(req);
    if (!status) {
      return next(new AppError("Status is required", 400));
    }
    const [payrolls, total] = await prisma.$transaction([
      prisma.payroll.findMany({
        where: { status },
        orderBy: { [sort]: order },
        skip: skip,
        take: limit,
      }),
      prisma.payroll.count({
        where: { status },
      }),
    ]);
    if (!["PENDING", "APPROVED", "REJECTED", "PAID"].includes(status)) {
      return next(new AppError("Invalid status value", 400));
    }
    if (!payrolls || payrolls.length === 0) {
      return next(new AppError("No payrolls found for the given status", 404));
    }
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    res.status(200).json({
      status: "success",
      data: payrolls,
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

export const getAllPayrollsByMonth = async (req, res, next) => {
  try {
    const { month } = req.params;
    const { page, limit, skip, order, sort } = pagination(req);
    if (!month) {
      return next(new AppError("Month is required", 400));
    }
    if (isNaN(parseInt(month)) || parseInt(month) < 1 || parseInt(month) > 12) {
      return next(new AppError("Invalid month value", 400));
    }
    const [payrolls, total] = await prisma.$transaction([
      prisma.payroll.findMany({
        where: { month: parseInt(month) },
        orderBy: { [sort]: order },
        skip: skip,
        take: limit,
      }),
      prisma.payroll.count({
        where: { month: parseInt(month) },
      }),
    ]);
    if (!payrolls || payrolls.length === 0) {
      return next(new AppError("No payrolls found for the given month", 404));
    }
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    res.status(200).json({
      status: "success",
      data: payrolls,
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

export const getAllPayrollsByYear = async (req, res, next) => {
  try {
    const { year } = req.params;
    const { page, limit, skip, order, sort } = pagination(req);
    if (!year) {
      return next(new AppError("Year is required", 400));
    }
    if (isNaN(parseInt(year)) || parseInt(year) < 2000) {
      return next(new AppError("Invalid year value", 400));
    }
    const [payrolls, total] = await prisma.$transaction([
      prisma.payroll.findMany({
        where: { year: parseInt(year) },
        orderBy: { [sort]: order },
        skip: skip,
        take: limit,
      }),
      prisma.payroll.count({
        where: { year: parseInt(year) },
      }),
    ]);
    if (!payrolls || payrolls.length === 0) {
      return next(new AppError("No payrolls found for the given year", 404));
    }
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    res.status(200).json({
      status: "success",
      data: payrolls,
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

export const deleteAllPayrolls = async (req, res, next) => {
  try {
    const result = await prisma.payroll.deleteMany({});
    if (!result.count || result.count === 0) {
      return next(new AppError("No payroll records to delete", 404));
    }
    res
      .status(200)
      .json({ status: "success", message: "All payrolls deleted" });
  } catch (error) {
    next(error);
  }
};
