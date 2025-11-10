import type { ProductCategory } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

/* eslint-disable no-unused-vars */
type ModelDelegate = {
  findUnique: (args: { where: { id: number } }) => Promise<unknown>;
};
/* eslint-enable no-unused-vars */

// Helper function to get model delegate safely
function getModelDelegate(modelName: keyof typeof db): ModelDelegate {
  switch (modelName) {
    case "accessories":
      return db.accessories as unknown as ModelDelegate;
    case "music":
      return db.music as unknown as ModelDelegate;
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
      throw new Error(`Unsupported model: ${String(modelName)}`);
  }
}

// Category mapping: API category to Prisma ProductCategory and Review fields
const categoryMap: Record<
  string,
  {
    prismaCategory: ProductCategory;
    reviewField: keyof {
      musicId?: number;
      bookId?: number;
      meditationId?: number;
      fashionId?: number;
      livingId?: number;
      decorationId?: number;
      accessoriesId?: number;
    };
    modelName: keyof typeof db;
  }
> = {
  fashion: {
    prismaCategory: "FASHION",
    reviewField: "fashionId",
    modelName: "fashion"
  },
  decoration: {
    prismaCategory: "DECORATION",
    reviewField: "decorationId",
    modelName: "decoration"
  },
  meditation: {
    prismaCategory: "MEDITATION",
    reviewField: "meditationId",
    modelName: "meditation"
  },
  accessories: {
    prismaCategory: "ACCESSORIES",
    reviewField: "accessoriesId",
    modelName: "accessories"
  },
  "digital-books": {
    prismaCategory: "DIGITAL_BOOK",
    reviewField: "bookId",
    modelName: "digitalBook"
  },
  living: {
    prismaCategory: "HOME_LIVING",
    reviewField: "livingId",
    modelName: "homeAndLiving"
  },
  audio: {
    prismaCategory: "MUSIC",
    reviewField: "musicId",
    modelName: "music"
  }
};

export default {
  /**
   * Unified Review Endpoint - Write review for any product
   * Validates: User must have purchased and received (DELIVERED) the product
   */
  addReview: asyncHandler(async (req: _Request, res) => {
    const { category, productId } = req.body as {
      category: string;
      productId: number;
      rating: number;
      content: string;
    };
    const { rating, content } = req.body as {
      rating: number;
      content: string;
    };

    // Validate user
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Validate required fields
    if (!category || !productId || !rating || !content) {
      return httpResponse(req, res, reshttp.badRequestCode, "Category, productId, rating, and content are required");
    }

    // Normalize category (handle variations like "digital-books" vs "book")
    const normalizedCategory = category.toLowerCase().replace(/[-_]/g, "-");
    const categoryConfig = categoryMap[normalizedCategory];

    if (!categoryConfig) {
      return httpResponse(req, res, reshttp.badRequestCode, `Invalid category. Valid categories: ${Object.keys(categoryMap).join(", ")}`);
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return httpResponse(req, res, reshttp.badRequestCode, "Rating must be between 1 and 5");
    }

    // Check if product exists
    const model = getModelDelegate(categoryConfig.modelName);
    const product = await model.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return httpResponse(req, res, reshttp.notFoundCode, "Product not found");
    }

    // 🔒 CRITICAL: Validate user has purchased and received this product
    // Check if user has a DELIVERED order containing this product
    const deliveredOrderItem = await db.orderItem.findFirst({
      where: {
        order: {
          userId: user.id,
          status: "DELIVERED"
        },
        category: categoryConfig.prismaCategory,
        productId: Number(productId)
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            userId: true
          }
        }
      }
    });

    if (!deliveredOrderItem) {
      return httpResponse(
        req,
        res,
        reshttp.forbiddenCode,
        "You can only review products you have purchased and received. Please ensure your order status is DELIVERED."
      );
    }

    // Check if user has already reviewed this product
    const existingReview = await db.review.findFirst({
      where: {
        userId: user.id,
        [categoryConfig.reviewField]: Number(productId)
      }
    });

    if (existingReview) {
      return httpResponse(req, res, reshttp.conflictCode, "You have already reviewed this product");
    }

    // Create review
    const review = await db.review.create({
      data: {
        rating: Number(rating),
        content: String(content),
        userId: user.id,
        [categoryConfig.reviewField]: Number(productId)
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

    logger.info(`Review added by user ${user.fullName} (${user.id}) for ${category} product ${productId}`);
    return httpResponse(req, res, reshttp.createdCode, "Review added successfully", review);
  }),

  /**
   * Get reviews for a product
   */
  getReviews: asyncHandler(async (req: _Request, res) => {
    const { category, productId } = req.query as {
      category: string;
      productId: string;
    };

    if (!category || !productId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Category and productId are required");
    }

    // Normalize category
    const normalizedCategory = category.toLowerCase().replace(/[-_]/g, "-");
    const categoryConfig = categoryMap[normalizedCategory];

    if (!categoryConfig) {
      return httpResponse(req, res, reshttp.badRequestCode, `Invalid category. Valid categories: ${Object.keys(categoryMap).join(", ")}`);
    }

    // Check if product exists
    const model = getModelDelegate(categoryConfig.modelName);
    const product = await model.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return httpResponse(req, res, reshttp.notFoundCode, "Product not found");
    }

    // Get reviews
    const reviews = await db.review.findMany({
      where: {
        [categoryConfig.reviewField]: Number(productId)
      },
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
