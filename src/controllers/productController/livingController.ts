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
  // Create Home and Living item
  create: asyncHandler(async (req: _Request, res) => {
    const images = req.files as MulterFiles;
    const data = req.body as T_ITEM;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check for existing SKU
    const existingItem = await db.homeAndLiving.findFirst({
      where: { sku: data.sku }
    });

    if (existingItem) {
      return httpResponse(req, res, reshttp.conflictCode, "Home and Living item with this SKU already exists");
    }

    const homeAndLivingItem = await db.homeAndLiving.create({
      data: {
        title: data.title,
        description: data.description,
        price: Number(data.price),
        tags: data.tags || [],
        sku: data.sku,
        stock: Number(data.stock) || 0,
        images: images.images?.map((file) => file.path) || []
      }
    });

    logger.info(`Home and Living item created: ${homeAndLivingItem.title}`);
    return httpResponse(req, res, reshttp.createdCode, "Home and Living item created successfully", homeAndLivingItem);
  }),

  // Get all home and living items
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

    const where: Prisma.HomeAndLivingWhereInput = {};
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const orderBy = { [sortBy]: sortOrder };

    const total = await db.homeAndLiving.count({ where });
    const homeAndLivingItems = await db.homeAndLiving.findMany({
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
      homeAndLivingItems,
      pagination: {
        totalItems: total,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        limit: limitNumber,
        hasNextPage: pageNumber < Math.ceil(total / limitNumber),
        hasPrevPage: pageNumber > 1
      }
    });
  }),

  // Get single home and living item
  getById: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const homeAndLivingItem = await db.homeAndLiving.findFirst({
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

    if (!homeAndLivingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Home and Living item not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, homeAndLivingItem);
  }),

  // Update home and living item
  update: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const images = req.files as MulterFiles;
    const data = req.body as Partial<T_ITEM>;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if item exists
    const existingItem = await db.homeAndLiving.findFirst({
      where: { id: Number(id) }
    });

    if (!existingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Home and Living item not found");
    }

    // Check SKU uniqueness if updating SKU
    if (data.sku && data.sku !== existingItem.sku) {
      const skuExists = await db.homeAndLiving.findFirst({
        where: { sku: data.sku }
      });
      if (skuExists) {
        return httpResponse(req, res, reshttp.conflictCode, "SKU already exists");
      }
    }

    const updateData: Prisma.HomeAndLivingUpdateInput = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price) updateData.price = Number(data.price);
    if (data.tags) updateData.tags = data.tags;
    if (data.sku) updateData.sku = data.sku;
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (images && images.images.length > 0) {
      updateData.images = images.images.map((file) => file.path);
    }

    const updatedItem = await db.homeAndLiving.update({
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

    logger.info(`Home and Living item updated: ${updatedItem.title}`);
    return httpResponse(req, res, reshttp.okCode, "Home and Living item updated successfully", updatedItem);
  }),

  // Delete home and living item
  delete: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const homeAndLivingItem = await db.homeAndLiving.findFirst({
      where: { id: Number(id) }
    });

    if (!homeAndLivingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Home and Living item not found");
    }

    await db.homeAndLiving.update({
      where: { id: Number(id) },
      data: { isDelete: true }
    });

    logger.info(`Home and Living item deleted: ${homeAndLivingItem.title}`);
    return httpResponse(req, res, reshttp.okCode, "Home and Living item deleted successfully");
  }),

  // Add review to home and living item
  // Add review to home and living item
  addReview: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const data = req.body as ReviewData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const homeAndLivingItem = await db.homeAndLiving.findFirst({
      where: { id: Number(id) }
    });

    if (!homeAndLivingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Home and Living item not found");
    }

    // Optional: Check if user has already reviewed this item
    const existingReview = await db.review.findFirst({
      where: {
        userId: user.id,
        livingId: homeAndLivingItem.id
      }
    });

    if (existingReview) {
      return httpResponse(req, res, reshttp.conflictCode, "You have already reviewed this item");
    }

    const review = await db.review.create({
      data: {
        rating: data.rating,
        content: data.content,
        userId: user.id,
        livingId: homeAndLivingItem.id
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

    logger.info(`Review added by user ${user.fullName} for item ${homeAndLivingItem.title}`);
    return httpResponse(req, res, reshttp.createdCode, "Review added successfully", review);
  }),
  getReviews: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const accessory = await db.homeAndLiving.findFirst({
      where: { id: Number(id) }
    });

    if (!accessory) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found");
    }

    const reviews = await db.review.findMany({
      where: { accessoriesId: Number(id) },
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
