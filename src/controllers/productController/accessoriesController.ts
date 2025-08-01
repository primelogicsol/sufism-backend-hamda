import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { T_ITEM } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

interface SearchQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface ReviewData {
  rating: number;
  content: string;
}

export default {
  // Create Accessory
  create: asyncHandler(async (req: _Request, res) => {
    const images = req.files as Express.Multer.File[];
    const data = req.body as T_ITEM;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check for existing SKU
    const existingAccessory = await db.accessories.findFirst({
      where: { sku: data.sku }
    });

    if (existingAccessory) {
      return httpResponse(req, res, reshttp.conflictCode, "Accessory with this SKU already exists");
    }

    const accessory = await db.accessories.create({
      data: {
        title: data.title,
        description: data.description,
        price: Number(data.price),
        tags: data.tags || [],
        sku: data.sku,
        stock: Number(data.stock) || 0,
        images: images?.map((file) => file.path) || []
      }
    });

    logger.info(`Accessory created: ${accessory.title}`);
    return httpResponse(req, res, reshttp.createdCode, "Accessory created successfully", accessory);
  }),

  // Get all accessories
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

    const where: Prisma.AccessoriesWhereInput = {};
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const orderBy = { [sortBy]: sortOrder };

    const total = await db.accessories.count({ where });
    const accessories = await db.accessories.findMany({
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
      accessories,
      pagination: {
        totalAccessories: total,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        limit: limitNumber,
        hasNextPage: pageNumber < Math.ceil(total / limitNumber),
        hasPrevPage: pageNumber > 1
      }
    });
  }),

  // Get single accessory
  getById: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const accessory = await db.accessories.findFirst({
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

    if (!accessory) {
      return httpResponse(req, res, reshttp.notFoundCode, "Accessory not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, accessory);
  }),

  // Update accessory
  update: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const images = req.files as Express.Multer.File[];
    const data = req.body as Partial<T_ITEM>;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if accessory exists
    const existingAccessory = await db.accessories.findFirst({
      where: { id: Number(id) }
    });

    if (!existingAccessory) {
      return httpResponse(req, res, reshttp.notFoundCode, "Accessory not found");
    }

    // Check SKU uniqueness if updating SKU
    if (data.sku && data.sku !== existingAccessory.sku) {
      const skuExists = await db.accessories.findFirst({
        where: { sku: data.sku }
      });
      if (skuExists) {
        return httpResponse(req, res, reshttp.conflictCode, "SKU already exists");
      }
    }

    const updateData: Prisma.AccessoriesUpdateInput = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price) updateData.price = Number(data.price);
    if (data.tags) updateData.tags = data.tags;
    if (data.sku) updateData.sku = data.sku;
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (images && images.length > 0) {
      updateData.images = images.map((file) => file.path);
    }

    const updatedAccessory = await db.accessories.update({
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

    logger.info(`Accessory updated: ${updatedAccessory.title}`);
    return httpResponse(req, res, reshttp.okCode, "Accessory updated successfully", updatedAccessory);
  }),

  // Delete accessory
  delete: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const accessory = await db.accessories.findFirst({
      where: { id: Number(id) }
    });

    if (!accessory) {
      return httpResponse(req, res, reshttp.notFoundCode, "Accessory not found");
    }

    await db.accessories.update({
      where: { id: Number(id) },
      data: { isDelete: true }
    });

    logger.info(`Accessory deleted: ${accessory.title}`);
    return httpResponse(req, res, reshttp.okCode, "Accessory deleted successfully");
  }),

  // Add review to accessory
  addReview: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const data = req.body as ReviewData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const accessory = await db.accessories.findFirst({
      where: { id: Number(id) }
    });

    if (!accessory) {
      return httpResponse(req, res, reshttp.notFoundCode, "Accessory not found");
    }

    const review = await db.review.create({
      data: {
        rating: data.rating,
        content: data.content,
        userId: user.id,
        accessoriesId: accessory.id
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

  // Get reviews for accessory
  getReviews: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const accessory = await db.accessories.findFirst({
      where: { id: Number(id) }
    });

    if (!accessory) {
      return httpResponse(req, res, reshttp.notFoundCode, "Accessory not found");
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
