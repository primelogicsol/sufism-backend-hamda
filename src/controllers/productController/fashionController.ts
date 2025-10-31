import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { ReviewData, SearchQuery, T_ITEM } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
type MulterFiles = Record<string, Express.Multer.File[]>;

export default {
  create: asyncHandler(async (req: _Request, res) => {
    const images = (req.files as MulterFiles) || ({} as MulterFiles);
    const data = req.body as T_ITEM;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check for existing SKU
    const existingfashion = await db.fashion.findFirst({
      where: { sku: data.sku, isDelete: false, userId: user.id }
    });

    if (existingfashion) {
      return httpResponse(req, res, reshttp.conflictCode, "Item with this SKU already exists");
    }

    const fashion = await db.fashion.create({
      data: {
        title: data.title,
        name: data.name,
        color: data.color,
        care: data.care,
        material: data.material,
        shippingTime: data.shippingTime,
        description: data.description,
        price: Number(data.price),
        tags: data.tags || [],
        sku: data.sku,
        userId: user.id,
        stock: Number(data.stock) || 0,
        weight: data.weight !== undefined ? Number(data.weight) : undefined,
        images: Array.isArray(images?.images) ? images.images.map((file) => file.path) : []
      }
    });

    logger.info(`Item created: ${fashion.title}`);
    return httpResponse(req, res, reshttp.createdCode, "Item created successfully", fashion);
  }),

  // Get all fashion
  getAll: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const { page = "1", limit = "10", search = "", sortBy = "createdAt", sortOrder = "desc" } = req.query as SearchQuery;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const where: Prisma.FashionWhereInput = { isDelete: false };
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (user.role == "vendor") {
      where.userId = user.id;
    }
    const orderBy = { [sortBy]: sortOrder };

    const total = await db.fashion.count({ where });
    const fashion = await db.fashion.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy,
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
      fashion,
      pagination: {
        totalFashionItems: total,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        limit: limitNumber,
        hasNextPage: pageNumber < Math.ceil(total / limitNumber),
        hasPrevPage: pageNumber > 1
      }
    });
  }),

  getById: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const fashion = await db.fashion.findFirst({
      where: { id: Number(id) },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!fashion) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, fashion);
  }),

  // Update fashion
  update: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const images = (req.files as MulterFiles) || ({} as MulterFiles);
    const data = req.body as Partial<T_ITEM>;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if fashion exists
    const existingfashion = await db.fashion.findFirst({
      where: { id: Number(id), isDelete: false, userId: user.id }
    });

    if (!existingfashion) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found");
    }

    // Check SKU uniqueness if updating SKU
    if (data.sku && data.sku !== existingfashion.sku) {
      const skuExists = await db.fashion.findFirst({
        where: { sku: data.sku }
      });
      if (skuExists) {
        return httpResponse(req, res, reshttp.conflictCode, "SKU already exists");
      }
    }

    const updateData: Prisma.FashionUpdateInput = {};
    if (data.title) updateData.title = data.title;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.care !== undefined) updateData.care = data.care;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.shippingTime !== undefined) updateData.shippingTime = data.shippingTime;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price) updateData.price = Number(data.price);
    if (data.tags) updateData.tags = data.tags;
    if (data.sku) updateData.sku = data.sku;
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (data.weight !== undefined) updateData.weight = Number(data.weight);
    if (Array.isArray(images?.images) && images.images.length > 0) {
      updateData.images = images.images.map((file) => file.path);
    }

    const updatedfashion = await db.fashion.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });

    logger.info(`Item updated: ${updatedfashion.title}`);
    return httpResponse(req, res, reshttp.okCode, "Item updated successfully", updatedfashion);
  }),

  // Delete fashion
  delete: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const fashion = await db.fashion.findFirst({
      where: { id: Number(id), userId: user.id }
    });

    if (!fashion) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found");
    }

    await db.fashion.update({
      where: { id: Number(id) },
      data: { isDelete: true }
    });

    logger.info(`Item deleted: ${fashion.title}`);
    return httpResponse(req, res, reshttp.okCode, "Item deleted successfully");
  }),

  // Add review to fashion
  addReview: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const data = req.body as ReviewData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const fashion = await db.fashion.findFirst({
      where: { id: Number(id) }
    });

    if (!fashion) {
      return httpResponse(req, res, reshttp.notFoundCode, "fashion not found");
    }

    const review = await db.review.create({
      data: {
        rating: data.rating,
        content: data.content,
        userId: user.id,
        fashionId: fashion.id
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return httpResponse(req, res, reshttp.createdCode, "Review added successfully", review);
  }),

  // Get reviews for fashion
  getReviews: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const fashion = await db.fashion.findFirst({
      where: { id: Number(id) }
    });

    if (!fashion) {
      return httpResponse(req, res, reshttp.notFoundCode, "fashion not found");
    }

    const reviews = await db.review.findMany({
      where: { fashionId: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, reviews);
  })
};
