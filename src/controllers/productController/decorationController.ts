import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { ReviewData, SearchQuery, T_ITEM } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  // Add this method to the existing controller
  bulkCreate: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    // Authorization check
    if (!user || user.role !== "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Get uploaded file
    const file = req.file;
    if (!file) {
      return httpResponse(req, res, reshttp.badRequestCode, "No file uploaded");
    }

    // Parse JSON content
    let items: T_ITEM[];
    try {
      const content = file.buffer.toString("utf-8");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      items = JSON.parse(content);

      if (!Array.isArray(items)) {
        throw new Error("Uploaded JSON must contain an array of decorations");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error(`Bulk import JSON parsing failed: ${error}`);
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid JSON format: " + error);
    }

    // Validate items
    if (items.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "No decorations found in file");
    }

    // Check for duplicate SKUs in request
    const skus = items.map((item) => item.sku);
    const duplicateSkus = skus.filter((sku, index) => skus.indexOf(sku) !== index);

    if (duplicateSkus.length > 0) {
      return httpResponse(req, res, reshttp.conflictCode, `Duplicate SKUs found in request: ${duplicateSkus.join(", ")}`);
    }

    // Check existing SKUs in database
    const existingDecorations = await db.decoration.findMany({
      where: { sku: { in: skus } }
    });

    if (existingDecorations.length > 0) {
      const existingSkus = existingDecorations.map((d) => d.sku);
      return httpResponse(req, res, reshttp.conflictCode, `SKUs already exist: ${existingSkus.join(", ")}`);
    }

    // Prepare data for bulk create
    const decorationsData = items.map((item) => ({
      title: item.title,
      description: item.description || "",
      price: Number(item.price),
      tags: item.tags || [],
      sku: item.sku,
      stock: Number(item.stock) || 0,
      images: [] // Bulk import doesn't support images
    }));

    // Create decorations in transaction
    try {
      const transaction = await db.$transaction(decorationsData.map((data) => db.decoration.create({ data })));

      logger.info(`Bulk import created ${transaction.length} decorations`);
      return httpResponse(req, res, reshttp.createdCode, `${transaction.length} decorations imported successfully`, transaction);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Bulk import failed: ${error.message}`);
      } else {
        logger.error(`Bulk import failed: ${String(error)}`);
      }
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create decorations");
    }
  }),

  // Create Decoration
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
    const existingDecoration = await db.decoration.findFirst({
      where: { sku: data.sku, isDelete: false }
    });

    if (existingDecoration) {
      return httpResponse(req, res, reshttp.conflictCode, "Decoration with this SKU already exists");
    }

    const decoration = await db.decoration.create({
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

    logger.info(`Decoration created: ${decoration.title}`);
    return httpResponse(req, res, reshttp.createdCode, "Decoration created successfully", decoration);
  }),

  // Get all decorations
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

    const orderBy = { [sortBy]: sortOrder };

    const where: Prisma.DecorationWhereInput = search
      ? {
          title: {
            contains: search,
            mode: "insensitive"
          }
        }
      : {};

    const total = await db.decoration.count({ where });

    const decorations = await db.decoration.findMany({
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
      decorations,
      pagination: {
        totalDecorations: total,
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        limit: limitNumber,
        hasNextPage: pageNumber < Math.ceil(total / limitNumber),
        hasPrevPage: pageNumber > 1
      }
    });
  }),

  // Get single decoration
  getById: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const decoration = await db.decoration.findFirst({
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

    if (!decoration) {
      return httpResponse(req, res, reshttp.notFoundCode, "Decoration not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, decoration);
  }),

  // Update decoration
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

    // Check if decoration exists
    const existingDecoration = await db.decoration.findFirst({
      where: { id: Number(id), isDelete: false }
    });

    if (!existingDecoration) {
      return httpResponse(req, res, reshttp.notFoundCode, "Decoration not found");
    }

    // Check SKU uniqueness if updating SKU
    if (data.sku && data.sku !== existingDecoration.sku) {
      const skuExists = await db.decoration.findFirst({
        where: { sku: data.sku }
      });
      if (skuExists) {
        return httpResponse(req, res, reshttp.conflictCode, "SKU already exists");
      }
    }
    const updateData: Prisma.DecorationUpdateInput = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price) updateData.price = Number(data.price);
    if (data.tags) updateData.tags = data.tags;
    if (data.sku) updateData.sku = data.sku;
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (images && images.length > 0) {
      updateData.images = images.map((file) => file.path);
    }

    const updatedDecoration = await db.decoration.update({
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

    logger.info(`Decoration updated: ${updatedDecoration.title}`);
    return httpResponse(req, res, reshttp.okCode, "Decoration updated successfully", updatedDecoration);
  }),

  // Delete decoration
  delete: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const decoration = await db.decoration.findFirst({
      where: { id: Number(id) }
    });

    if (!decoration) {
      return httpResponse(req, res, reshttp.notFoundCode, "Decoration not found");
    }

    await db.decoration.update({
      where: { id: Number(id) },
      data: { isDelete: true }
    });

    logger.info(`Decoration deleted: ${decoration.title}`);
    return httpResponse(req, res, reshttp.okCode, "Decoration deleted successfully");
  }),

  // Add review to decoration
  addReview: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const data = req.body as ReviewData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const decoration = await db.decoration.findFirst({
      where: { id: Number(id) }
    });

    if (!decoration) {
      return httpResponse(req, res, reshttp.notFoundCode, "Decoration not found");
    }

    const review = await db.review.create({
      data: {
        rating: data.rating,
        content: data.content,
        userId: user.id,
        decorationId: decoration.id
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

  // Get reviews for decoration
  getReviews: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const decoration = await db.decoration.findFirst({
      where: { id: Number(id) }
    });

    if (!decoration) {
      return httpResponse(req, res, reshttp.notFoundCode, "Decoration not found");
    }

    const reviews = await db.review.findMany({
      where: { decorationId: Number(id) },
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
