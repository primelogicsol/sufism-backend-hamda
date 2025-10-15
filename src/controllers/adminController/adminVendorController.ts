import type { Request, Response } from "express";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  /**
   * Get all vendors (Admin JWT Auth)
   */
  getAllVendors: asyncHandler(async (req: Request, res: Response) => {
    const {
      page = "1",
      limit = "10",
      status,
      search,
      isCompleted
    } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
      search?: string;
      isCompleted?: string;
    };

    try {
      const where: Record<string, unknown> = { role: "vendor" };

      if (status === "accepted") {
        where.vendoraccepted = true;
      } else if (status === "pending") {
        where.vendoraccepted = false;
      }

      if (isCompleted !== undefined) {
        where.isCompleted = isCompleted === "true";
      }

      if (search) {
        where.OR = [
          { email: { contains: search, mode: "insensitive" } },
          { fullName: { contains: search, mode: "insensitive" } },
          { businessName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } }
        ];
      }

      const take = Number(limit);
      const skip = (Number(page) - 1) * take;

      const [vendors, total] = await Promise.all([
        db.user.findMany({
          where,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            businessName: true,
            businessType: true,
            vendoraccepted: true,
            isCompleted: true,
            createdAt: true,
            avatar: true
          },
          skip,
          take,
          orderBy: { createdAt: "desc" }
        }),
        db.user.count({ where })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Vendors retrieved successfully", {
        vendors,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / take)
        }
      });
    } catch (error) {
      logger.error(`Error getting vendors: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendors");
    }
  }),

  /**
   * Approve vendor (Admin JWT Auth)
   */
  approveVendor: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const vendor = await db.user.findUnique({ where: { id } });
      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      if (vendor.role !== "vendor") {
        return httpResponse(req, res, reshttp.badRequestCode, "User is not a vendor");
      }

      const updatedVendor = await db.user.update({
        where: { id },
        data: { vendoraccepted: true },
        select: {
          id: true,
          fullName: true,
          email: true,
          businessName: true,
          vendoraccepted: true
        }
      });

      return httpResponse(req, res, reshttp.okCode, "Vendor approved successfully", updatedVendor);
    } catch (error) {
      logger.error(`Error approving vendor: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to approve vendor");
    }
  }),

  /**
   * Reject vendor (Admin JWT Auth)
   */
  rejectVendor: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    try {
      const vendor = await db.user.findUnique({ where: { id } });
      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      if (vendor.role !== "vendor") {
        return httpResponse(req, res, reshttp.badRequestCode, "User is not a vendor");
      }

      const updatedVendor = await db.user.update({
        where: { id },
        data: { vendoraccepted: false },
        select: {
          id: true,
          fullName: true,
          email: true,
          businessName: true,
          vendoraccepted: true
        }
      });

      return httpResponse(req, res, reshttp.okCode, "Vendor rejected successfully", {
        vendor: updatedVendor,
        reason: reason || "No reason provided"
      });
    } catch (error) {
      logger.error(`Error rejecting vendor: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to reject vendor");
    }
  }),

  /**
   * Get vendor details (Admin JWT Auth)
   */
  getVendorDetails: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const vendor = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          businessName: true,
          businessType: true,
          businessLegalStructure: true,
          einNumber: true,
          tinNumber: true,
          contactPerson: true,
          bankName: true,
          accountNumber: true,
          routingNumber: true,
          bankAddress: true,
          signatoryName: true,
          signatureDate: true,
          vendoraccepted: true,
          isCompleted: true,
          createdAt: true,
          avatar: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          country: true
        }
      });

      if (!vendor) {
        return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
      }

      if (vendor.role !== "vendor") {
        return httpResponse(req, res, reshttp.badRequestCode, "User is not a vendor");
      }

      return httpResponse(req, res, reshttp.okCode, "Vendor details retrieved successfully", vendor);
    } catch (error) {
      logger.error(`Error getting vendor details: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor details");
    }
  }),

  /**
   * Get vendor statistics (Admin JWT Auth)
   */
  getVendorStats: asyncHandler(async (req: Request, res: Response) => {
    try {
      const [totalVendors, approvedVendors, pendingVendors, completedVendors] = await Promise.all([
        db.user.count({ where: { role: "vendor" } }),
        db.user.count({ where: { role: "vendor", vendoraccepted: true } }),
        db.user.count({ where: { role: "vendor", vendoraccepted: false } }),
        db.user.count({ where: { role: "vendor", isCompleted: true } })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Vendor statistics retrieved successfully", {
        totalVendors,
        approvedVendors,
        pendingVendors,
        completedVendors,
        approvalRate: totalVendors > 0 ? (approvedVendors / totalVendors) * 100 : 0,
        completionRate: totalVendors > 0 ? (completedVendors / totalVendors) * 100 : 0
      });
    } catch (error) {
      logger.error(`Error getting vendor statistics: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to get vendor statistics");
    }
  }),

  /**
   * Bulk approve vendors (Admin JWT Auth)
   */
  bulkApproveVendors: asyncHandler(async (req: Request, res: Response) => {
    const { vendorIds } = req.body as { vendorIds: string[] };

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "Vendor IDs array is required");
    }

    try {
      const result = await db.user.updateMany({
        where: {
          id: { in: vendorIds },
          role: "vendor"
        },
        data: { vendoraccepted: true }
      });

      return httpResponse(req, res, reshttp.okCode, `Successfully approved ${result.count} vendors`, {
        approvedCount: result.count,
        requestedCount: vendorIds.length
      });
    } catch (error) {
      logger.error(`Error bulk approving vendors: ${String(error)}`);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to bulk approve vendors");
    }
  })
};
