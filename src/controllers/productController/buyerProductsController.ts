/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

// Map category param -> actual Prisma model name
const categoryMap: Record<string, keyof typeof db> = {
  ACCESSORIES: "accessories",
  MUSIC: "music",
  COUPON: "coupon",
  DECORATION: "decoration",
  DIGITAL_BOOK: "digitalBook",
  FASHION: "fashion",
  HOME_LIVING: "homeAndLiving",
  MEDITATION: "meditation"
};

export default {
  // ✅ Get products by category (public)
  getByCategory: asyncHandler(async (req, res) => {
    const { category } = req.params;
    const {
      page = "1",
      limit = "10",
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query as {
      page?: string;
      limit?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    };

    const modelName = categoryMap[category.toUpperCase()];
    if (!modelName) {
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid category");
    }

    const model = (db as any)[modelName];

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const where: Prisma.DecorationWhereInput = { isDelete: false };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const total = await model.count({ where });

    const products = await model.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: { [sortBy]: sortOrder },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, fullName: true } }
          }
        }
      }
    });

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
      products,
      pagination: {
        total,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        hasNextPage: pageNumber < Math.ceil(total / limitNumber),
        hasPrevPage: pageNumber > 1
      }
    });
  }),

  // ✅ Get single product by category & ID (public)
  getProductDetails: asyncHandler(async (req, res) => {
    const { category, id } = req.params;

    const modelName = categoryMap[category.toUpperCase()];
    if (!modelName) {
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid category");
    }

    const model = (db as any)[modelName];

    const product = await model.findFirst({
      where: { id: Number(id), isDelete: false },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, fullName: true } }
          }
        }
      }
    });

    if (!product) {
      return httpResponse(req, res, reshttp.notFoundCode, "Product not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, product);
  })
};
