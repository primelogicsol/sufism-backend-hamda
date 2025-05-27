import { CATEGORY_TYPE, type Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TPRODUCT, TPRODUCT_SEARCH, TREVIEW } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

export default {
  product: asyncHandler(async (req: _Request, res) => {
    const images = req.files as Express.Multer.File[];
    const data = req.body as TPRODUCT;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const imagePaths = images.map((file) => file.path);
    const existingProduct = await db.product.findFirst({
      where: { sku: data.sku }
    });

    if (existingProduct) {
      return httpResponse(req, res, reshttp.conflictCode, "Product with this SKU already exists", existingProduct);
    }

    const product = await db.product.create({
      data: {
        title: data.title,
        description: data.description,
        price: Number(data.price),
        discount: Number(data.discount),
        stock: Number(data.stock),
        images: imagePaths, // storing local image paths
        deliveryTime: data.deliveryTime,
        returnPolicy: data.returnPolicy,
        tags: data.tags,
        category: data.category,
        sku: data.sku,
        isAvailable: data.isAvailable ?? true
      }
    });

    if (!product) {
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create product");
    }

    logger.info(`Product created: ${product.title}`);
    return httpResponse(req, res, reshttp.createdCode, "Product created", product);
  }),

  viewAllProduct: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Get query parameters with proper typing
    const { page = "1", limit = "10", search = "", category = "", sortBy = "createdAt", sortOrder = "desc" } = req.query as TPRODUCT_SEARCH;

    // Convert query parameters to appropriate types
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause with Prisma type
    const where: Prisma.ProductWhereInput = {};

    // Search functionality
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } }
        // { description: { contains: search, mode: "insensitive" } }
      ];
    }

    // Category filter
    if (category) {
      const categoryUpper = category.toUpperCase();

      const validCategories = Object.values(CATEGORY_TYPE);

      if (validCategories.includes(categoryUpper as CATEGORY_TYPE)) {
        where.category = categoryUpper as CATEGORY_TYPE;
      } else {
        return httpResponse(req, res, reshttp.badRequestCode, "Invalid category");
      }
    }

    // Build orderBy clause with Prisma type
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder
    };

    try {
      // Get total count for pagination
      const totalProducts = await db.product.count({ where });

      // Get paginated products
      const products = await db.product.findMany({
        where,
        skip,
        take: limitNumber,
        orderBy,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          discount: true,
          stock: true,
          images: true,
          category: true,
          sku: true,
          isAvailable: true,
          createdAt: true
        }
      });

      if (!products.length) {
        return httpResponse(req, res, reshttp.okCode, "No products found");
      }

      // Prepare pagination metadata
      const pagination = {
        totalProducts,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalProducts / limitNumber),
        limit: limitNumber,
        hasNextPage: pageNumber < Math.ceil(totalProducts / limitNumber),
        hasPrevPage: pageNumber > 1
      };

      // Response with products and pagination info
      httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
        products,
        pagination
      });
    } catch (error) {
      logger.error("Error fetching products:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to fetch products");
    }
  }),
  viewProduct: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    if (!id) {
      throw { status: reshttp.notFoundCode, message: "Product id required" };
    }
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const product = await db.product.findFirst({
      where: {
        id: Number(id)
      }
    });
    if (!product) return httpResponse(req, res, reshttp.okCode, reshttp.notFoundMessage);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, product);
  }),
  review: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TREVIEW;
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const product = await db.product.findFirst({
      where: { id: data.productId }
    });

    if (!product) {
      return httpResponse(req, res, reshttp.badRequestCode, "Product not found");
    }

    const review = await db.review.create({
      data: {
        rating: data.rating,
        review: data.review,
        userId: user.id,
        productId: data.productId
      }
    });

    if (!review) {
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create review");
    }
    return httpResponse(req, res, reshttp.createdCode, "Review created", review);
  }),
  viewReview: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const reviews = await db.review.findMany({
      where: { productId: Number(id) }
    });
    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, reviews);
  })
};
