import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import type { Prisma } from "@prisma/client"; // 🔹 Import Prisma types

export default {
  getVendors: asyncHandler(async (req, res) => {
    try {
      const {
        page = "1",
        limit = "10",
        search = "",
        sort = "newest", // newest | oldest
        verified // "true" | "false"
      } = req.query as Record<string, string>;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // ✅ Strongly typed filter
      const where: Prisma.UserWhereInput = {
        role: "vendor",
        isCompleted: true
      };

      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { businessName: { contains: search, mode: "insensitive" } }
        ];
      }

      if (verified === "true") {
        where.isVerified = true;
      } else if (verified === "false") {
        where.isVerified = false;
      }

      // ✅ OrderBy typed
      const orderBy: Prisma.UserOrderByWithRelationInput = {
        createdAt: sort === "oldest" ? "asc" : "desc"
      };

      // Fetch data
      const [vendors, total] = await Promise.all([
        db.user.findMany({
          where,
          skip,
          take,
          orderBy,
          select: {
            id: true,
            fullName: true,
            email: true,
            businessName: true,
            businessType: true,
            phone: true,
            vendoraccepted: true,
            isVerified: true,
            createdAt: true
          }
        }),
        db.user.count({ where })
      ]);

      return httpResponse(req, res, reshttp.okCode, "Vendors fetched successfully", {
        vendors,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error(error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Something went wrong");
    }
  }),

  deleteVendor: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const vendor = await db.user.findUnique({ where: { id } });

    if (!vendor || vendor.role !== "vendor") {
      return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
    }

    await db.user.delete({ where: { id } });

    return httpResponse(req, res, reshttp.okCode, "Vendor deleted successfully");
  }),

  verifyVendor: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status: boolean }; // ✅ typed body

    const vendor = await db.user.findUnique({ where: { id } });

    if (!vendor || vendor.role !== "vendor") {
      return httpResponse(req, res, reshttp.notFoundCode, "Vendor not found");
    }

    const updatedVendor = await db.user.update({
      where: { id },
      data: { isVerified: Boolean(status) },
      select: {
        id: true,
        fullName: true,
        email: true,
        isVerified: true
      }
    });

    return httpResponse(req, res, reshttp.okCode, `Vendor ${status ? "verified" : "unverified"} successfully`, updatedVendor);
  })
};
