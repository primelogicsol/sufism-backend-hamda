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

type CommonWhere = {
  isDelete?: boolean;
  title?: { contains: string; mode?: Prisma.QueryMode };
  id?: number;
};

/* eslint-disable no-unused-vars */
type ModelDelegate = {
  count: (_args: { where?: CommonWhere }) => Promise<number>;
  findMany: (_args: {
    where?: CommonWhere;
    skip?: number;
    take?: number;
    orderBy?: Record<string, "asc" | "desc">;
    include?: unknown;
  }) => Promise<unknown[]>;
  findFirst: (_args: { where: CommonWhere; include?: unknown }) => Promise<unknown>;
};
/* eslint-enable no-unused-vars */

function getModelDelegate(modelName: keyof typeof db): ModelDelegate {
  // Cast the specific Prisma delegates to a safe minimal interface to avoid any
  switch (modelName) {
    case "accessories":
      return db.accessories as unknown as ModelDelegate;
    case "music":
      return db.music as unknown as ModelDelegate;
    case "coupon":
      return db.coupon as unknown as ModelDelegate;
    case "decoration":
      return db.decoration as unknown as ModelDelegate;
    case "digitalBook":
      return db.digitalBook as unknown as ModelDelegate;
    case "fashion":
      return db.fashion as unknown as ModelDelegate;
    case "homeAndLiving":
      return db.homeAndLiving as unknown as ModelDelegate;
    case "meditation":
      return db.meditation as unknown as ModelDelegate;
    default:
      // Exhaustive guard
      throw new Error(`Unsupported model: ${String(modelName)}`);
  }
}

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

    const model = getModelDelegate(modelName);

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const where: CommonWhere = { isDelete: false };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const total = await model.count({ where });

    const products = await model.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: { [sortBy]: sortOrder } as Record<string, "asc" | "desc">,
      include: {
        reviews: {
          include: {
            user: { select: { id: true, fullName: true } }
          }
        }
      } as unknown
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

    const model = getModelDelegate(modelName);

    const product = await model.findFirst({
      where: { id: Number(id), isDelete: false },
      include: {
        reviews: {
          include: {
            user: { select: { id: true, fullName: true } }
          }
        }
      } as unknown
    });

    if (!product) {
      return httpResponse(req, res, reshttp.notFoundCode, "Product not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, product);
  })
};
