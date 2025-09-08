/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

interface DigitalBookData {
  author?: string;
  genre?: string;
  releaseDate?: string;
  url?: string;
  fileType: string;
  coverImage?: string;
  isAvailable?: string;
  overviewImages?: string[];
  title: string;
  description: string;
  price: number;
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
type MulterFiles = Record<string, Express.Multer.File[]>;

export default {
  // Create Digital Book
  create: asyncHandler(async (req: _Request, res) => {
    try {
      const files = req.files as MulterFiles;
      const data = req.body as DigitalBookData;
      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });
      //  logger.info(files);
      if (!user || user.role !== "vendor") {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;

      if (releaseDate && isNaN(releaseDate.getTime())) {
        return httpResponse(req, res, reshttp.forbiddenCode, "Invalid releaseDate format");
      }
      if (isNaN(Number(data.price))) {
        return httpResponse(req, res, reshttp.badRequestCode, "Invalid price");
      }
      if (!files?.thumbnail?.length) {
        return httpResponse(req, res, reshttp.badRequestCode, "Cover image (thumbnail) is required");
      }

      if (!files?.document?.length) {
        return httpResponse(req, res, reshttp.badRequestCode, "Document is required");
      }
      const digitalBook = await db.digitalBook.create({
        data: {
          userId: user.id,
          title: data.title,
          description: data.description,
          author: data.author,
          genre: data.genre,
          price: Number(data.price),
          releaseDate: releaseDate || null,
          url: files?.document?.[0]?.path || "",
          overviewImages: files?.overviewImages?.map((file) => file.path) || [],
          coverImage: files?.thumbnail?.[0]?.path || "",
          isAvailable: data.isAvailable === "true"
        }
      });

      logger.info(`Digital book created with ID: ${digitalBook.id}`);
      return httpResponse(req, res, reshttp.createdCode, "Digital book created successfully", digitalBook);
    } catch (error) {
      logger.error("Error creating digital book:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Something went wrong while creating the digital book");
    }
  }),

  // Get all digital books
  getAll: asyncHandler(async (req: _Request, res) => {
    try {
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

      const where: Prisma.DigitalBookWhereInput = {
        isDelete: false
      };
      if (user.role === "vendor") {
        where.userId = user.id;
      }

      if (search) {
        where.OR = [
          { author: { contains: search, mode: "insensitive" } },
          { genre: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } } // ✅ bonus: allow search by title
        ];
      }

      if (genre) {
        where.genre = { contains: genre, mode: "insensitive" };
      }

      if (author) {
        where.author = { contains: author, mode: "insensitive" };
      }

      const orderBy: Prisma.DigitalBookOrderByWithRelationInput = { [sortBy]: sortOrder };

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
      let finalBooks;
      if (user.role == "user") {
        finalBooks = digitalBooks.map((book) => {
          // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
          const { url, ...rest } = book;
          return rest;
        });
        return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
          digitalBooks: finalBooks,
          pagination: {
            totalItems: total,
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            limit: limitNumber,
            hasNextPage: pageNumber < Math.ceil(total / limitNumber),
            hasPrevPage: pageNumber > 1
          }
        });
      }
      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, {
        digitalBooks: digitalBooks,
        pagination: {
          totalItems: total,
          currentPage: pageNumber,
          totalPages: Math.ceil(total / limitNumber),
          limit: limitNumber,
          hasNextPage: pageNumber < Math.ceil(total / limitNumber),
          hasPrevPage: pageNumber > 1
        }
      });
    } catch (error) {
      logger.error("Error fetching digital books:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Something went wrong while fetching the digital books");
    }
  }),

  // Get single digital book
  getById: asyncHandler(async (req: _Request, res) => {
    try {
      const { id } = req.params;
      logger.info(id);
      if (!id || isNaN(Number(id))) {
        return httpResponse(req, res, reshttp.badRequestCode, "Invalid book ID");
      }

      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user) {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }

      const digitalBook = await db.digitalBook.findFirst({
        where: { id: Number(id), isDelete: false },
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
      let responseBook;
      if (user.role !== "vendor") {
        // eslint-disable-next-line no-unused-vars
        const { url, ...rest } = digitalBook;
        responseBook = rest;
        return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, responseBook);
      }
      return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, digitalBook);
    } catch (error) {
      logger.error("Error fetching digital book by ID:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Something went wrong while fetching the digital book");
    }
  }),

  // Update digital book
  update: asyncHandler(async (req: _Request, res) => {
    try {
      const { id } = req.params;
      const files = req.files as MulterFiles;
      const data = req.body as Partial<DigitalBookData>;

      if (!id || isNaN(Number(id))) {
        return httpResponse(req, res, reshttp.badRequestCode, "Invalid book ID");
      }

      const user = await db.user.findFirst({
        where: { id: req.userFromToken?.id }
      });

      if (!user || user.role !== "vendor") {
        return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
      }
      const existingBook = await db.digitalBook.findFirst({
        where: { id: Number(id), isDelete: false, userId: user.id }
      });

      if (!existingBook) {
        return httpResponse(req, res, reshttp.notFoundCode, "Digital book not found");
      }
      const releaseDate = data.releaseDate ? new Date(data.releaseDate) : null;
      if (releaseDate && isNaN(releaseDate.getTime())) {
        return httpResponse(req, res, reshttp.forbiddenCode, "Invalid releaseDate format");
      }

      const updateData: Prisma.DigitalBookUpdateInput = {};

      if (data.author) updateData.author = data.author;
      if (data.genre) updateData.genre = data.genre;
      if (data.description) updateData.description = data.description;
      if (data.releaseDate) updateData.releaseDate = releaseDate;
      if (files?.document?.length) updateData.url = files.document[0].path;
      if (files?.overviewImages?.length) updateData.overviewImages = files.overviewImages.map((file) => file.path);
      if (files?.thumbnail?.length) updateData.coverImage = files.thumbnail[0].path;
      if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable == "true";

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

      logger.info(`✅ Digital book updated successfully with ID: ${updatedBook.id}`);
      return httpResponse(req, res, reshttp.okCode, "Digital book updated successfully", updatedBook);
    } catch (error) {
      logger.error("❌ Error updating digital book:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Something went wrong while updating the digital book");
    }
  }),

  // Delete digital book
  delete: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const digitalBook = await db.digitalBook.findFirst({
      where: { id: Number(id), userId: user.id }
    });

    if (!digitalBook) {
      return httpResponse(req, res, reshttp.notFoundCode, "Digital book not found");
    }

    await db.digitalBook.update({
      where: { id: Number(id) },
      data: { isDelete: true }
    });

    logger.info(`Digital book deleted with product`);
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

    logger.info(`Review added by user for digital book with product ID ${digitalBook.author}`);
    return httpResponse(req, res, reshttp.createdCode, "Review added successfully", review);
  })
};
