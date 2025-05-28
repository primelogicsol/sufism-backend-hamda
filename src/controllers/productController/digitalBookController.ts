import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

interface DigitalBookData {
  productId: number;
  author?: string;
  genre?: string;
  releaseDate?: string;
  url: string;
  fileType: string;
  coverImage?: string;
  isAvailable?: boolean;
}

interface SearchQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  genre?: string;
  author?: string;
}

interface ReviewData {
  rating: number;
  content: string;
}

export default {
  // Create Digital Book
  create: asyncHandler(async (req: _Request, res) => {
    const files = req.files as Express.Multer.File[];
    const data = req.body as DigitalBookData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "member") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check for existing productId
    const existingBook = await db.digitalBook.findFirst({
      where: { productId: Number(data.productId) }
    });

    if (existingBook) {
      return httpResponse(req, res, reshttp.conflictCode, "Digital book with this product ID already exists");
    }

    const digitalBook = await db.digitalBook.create({
      data: {
        productId: Number(data.productId),
        author: data.author,
        genre: data.genre,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
        url: data.url,
        fileType: data.fileType,
        coverImage: files?.find((f) => f.fieldname === "coverImage")?.path || data.coverImage,
        isAvailable: data.isAvailable ?? false
      }
    });

    logger.info(`Digital book created with product ID: ${digitalBook.productId}`);
    return httpResponse(req, res, reshttp.createdCode, "Digital book created successfully", digitalBook);
  }),

  // Get all digital books
  getAll: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const { page = "1", limit = "10", search = "", sortBy = "createdAt", sortOrder = "desc", genre, author } = req.query as SearchQuery;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const where: Prisma.DigitalBookWhereInput = {};

    if (search) {
      where.OR = [{ author: { contains: search, mode: "insensitive" } }, { genre: { contains: search, mode: "insensitive" } }];
    }

    if (genre) {
      where.genre = { contains: genre, mode: "insensitive" };
    }

    if (author) {
      where.author = { contains: author, mode: "insensitive" };
    }

    const orderBy = { [sortBy]: sortOrder };

    const total = await db.digitalBook.count({ where });
    const digitalBooks = await db.digitalBook.findMany({
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
      digitalBooks,
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

  // Get single digital book
  getById: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const digitalBook = await db.digitalBook.findFirst({
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

    if (!digitalBook) {
      return httpResponse(req, res, reshttp.notFoundCode, "Digital book not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, digitalBook);
  }),

  // Update digital book
  update: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const data = req.body as Partial<DigitalBookData>;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "member") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if book exists
    const existingBook = await db.digitalBook.findFirst({
      where: { id: Number(id) }
    });

    if (!existingBook) {
      return httpResponse(req, res, reshttp.notFoundCode, "Digital book not found");
    }

    // Check productId uniqueness if updating productId
    if (data.productId && data.productId !== existingBook.productId) {
      const productIdExists = await db.digitalBook.findFirst({
        where: { productId: Number(data.productId) }
      });
      if (productIdExists) {
        return httpResponse(req, res, reshttp.conflictCode, "Product ID already exists");
      }
    }

    const updateData: Prisma.DigitalBookUpdateInput = {};
    if (data.productId) updateData.productId = Number(data.productId);
    if (data.author !== undefined) updateData.author = data.author;
    if (data.genre !== undefined) updateData.genre = data.genre;
    if (data.releaseDate !== undefined) updateData.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;
    if (data.url) updateData.url = data.url;
    if (data.fileType) updateData.fileType = data.fileType;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;

    if (files?.find((f) => f.fieldname === "coverImage")) {
      updateData.coverImage = files.find((f) => f.fieldname === "coverImage")?.path;
    } else if (data.coverImage !== undefined) {
      updateData.coverImage = data.coverImage;
    }

    const updatedBook = await db.digitalBook.update({
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

    logger.info(`Digital book updated with product ID: ${updatedBook.productId}`);
    return httpResponse(req, res, reshttp.okCode, "Digital book updated successfully", updatedBook);
  }),

  // Delete digital book
  delete: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "member") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const digitalBook = await db.digitalBook.findFirst({
      where: { id: Number(id) }
    });

    if (!digitalBook) {
      return httpResponse(req, res, reshttp.notFoundCode, "Digital book not found");
    }

    await db.digitalBook.update({
      where: { id: Number(id) },
      data: { isDelete: true }
    });

    logger.info(`Digital book deleted with product ID: ${digitalBook.productId}`);
    return httpResponse(req, res, reshttp.okCode, "Digital book deleted successfully");
  }),

  // Add review to digital book
  addReview: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const data = req.body as ReviewData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const digitalBook = await db.digitalBook.findFirst({
      where: { id: Number(id) }
    });

    if (!digitalBook) {
      return httpResponse(req, res, reshttp.notFoundCode, "Digital book not found");
    }

    // Check if user has already reviewed this book
    const existingReview = await db.review.findFirst({
      where: {
        userId: user.id,
        bookId: digitalBook.id
      }
    });

    if (existingReview) {
      return httpResponse(req, res, reshttp.conflictCode, "You have already reviewed this digital book");
    }

    const review = await db.review.create({
      data: {
        rating: data.rating,
        content: data.content,
        userId: user.id,
        bookId: digitalBook.id
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    logger.info(`Review added by user for digital book with product ID ${digitalBook.productId}`);
    return httpResponse(req, res, reshttp.createdCode, "Review added successfully", review);
  })
};
