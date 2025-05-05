import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TPRODUCT, TREVIEW } from "../../types/types.js";
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
    const products = await db.product.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
    if (!products) return httpResponse(req, res, reshttp.notFoundCode, reshttp.notFoundMessage, products);
    httpResponse(req, res, reshttp.okCode, reshttp.okMessage, products);
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
    if (!product) return httpResponse(req, res, reshttp.notFoundCode, reshttp.notFoundMessage);
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
    const reviews =await db.review.findMany({
      where: { productId: Number(id) }
    });
    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, reviews);
  })
};
