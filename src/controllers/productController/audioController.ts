import type { Prisma } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { ReviewData, SearchQuery } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";

interface MusicData {
  productId: number;
  title: string;
  artist?: string;
  mp3Url?: string;
  mp4Url?: string;
  duration?: number;
  isAvailable?: boolean;
}

export default {
  // Create Music
  create: asyncHandler(async (req: _Request, res) => {
    const files = req.files as Express.Multer.File[];
    const data = req.body as MusicData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // // Check for existing productId
    // const existingMusic = await db.music.findFirst({
    //   where: { productId: Number(data.productId) }
    // });

    // if (existingMusic) {
    //   return httpResponse(req, res, reshttp.conflictCode, "Music with this product ID already exists");
    // }

    const music = await db.music.create({
      data: {
        title: data.title,
        artist: data.artist,
        mp3Url: files?.find((f) => f.fieldname === "mp3File")?.path || data.mp3Url,
        mp4Url: files?.find((f) => f.fieldname === "mp4File")?.path || data.mp4Url,
        duration: data.duration ? Number(data.duration) : null,
        isAvailable: data.isAvailable ?? false
      }
    });

    logger.info(`Music created: ${music.title} by ${music.artist || "Unknown Artist"}`);
    return httpResponse(req, res, reshttp.createdCode, "Music created successfully", music);
  }),

  // Get all music
  getAll: asyncHandler(async (req: _Request, res) => {
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const { page = "1", limit = "10", search = "", sortBy = "createdAt", sortOrder = "desc", artist } = req.query as SearchQuery;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const where: Prisma.MusicWhereInput = {};

    if (search) {
      where.OR = [{ title: { contains: search, mode: "insensitive" } }, { artist: { contains: search, mode: "insensitive" } }];
    }

    if (artist) {
      where.artist = { contains: artist, mode: "insensitive" };
    }

    const orderBy = { [sortBy]: sortOrder };

    const total = await db.music.count({ where });
    const musicTracks = await db.music.findMany({
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
      musicTracks,
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

  // Get single music track
  getById: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const music = await db.music.findFirst({
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

    if (!music) {
      return httpResponse(req, res, reshttp.notFoundCode, "Music not found");
    }

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, music);
  }),

  // Update music
  update: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const data = req.body as Partial<MusicData>;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // Check if music exists
    const existingMusic = await db.music.findFirst({
      where: { id: Number(id) }
    });

    if (!existingMusic) {
      return httpResponse(req, res, reshttp.notFoundCode, "Music not found");
    }

    // Check productId uniqueness if updating productId
    // if (data.productId && data.productId !== existingMusic.productId) {
    //   const productIdExists = await db.music.findFirst({
    //     where: { productId: Number(data.productId) }
    //   });
    //   if (productIdExists) {
    //     return httpResponse(req, res, reshttp.conflictCode, "Product ID already exists");
    //   }
    // }

    const updateData: Prisma.MusicUpdateInput = {};
    if (data.title) updateData.title = data.title;
    if (data.artist !== undefined) updateData.artist = data.artist;
    if (data.duration !== undefined) updateData.duration = data.duration ? Number(data.duration) : null;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;

    if (files?.find((f) => f.fieldname === "mp3File")) {
      updateData.mp3Url = files.find((f) => f.fieldname === "mp3File")?.path;
    } else if (data.mp3Url !== undefined) {
      updateData.mp3Url = data.mp3Url;
    }

    if (files?.find((f) => f.fieldname === "mp4File")) {
      updateData.mp4Url = files.find((f) => f.fieldname === "mp4File")?.path;
    } else if (data.mp4Url !== undefined) {
      updateData.mp4Url = data.mp4Url;
    }

    const updatedMusic = await db.music.update({
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

    logger.info(`Music updated: ${updatedMusic.title} by ${updatedMusic.artist || "Unknown Artist"}`);
    return httpResponse(req, res, reshttp.okCode, "Music updated successfully", updatedMusic);
  }),

  // Delete music
  delete: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user || user.role != "vendor") {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const music = await db.music.findFirst({
      where: { id: Number(id) }
    });

    if (!music) {
      return httpResponse(req, res, reshttp.notFoundCode, "Music not found");
    }

    await db.music.update({
      where: { id: Number(id) },
      data: { isDelete: true }
    });

    logger.info(`Music deleted: ${music.title} by ${music.artist || "Unknown Artist"}`);
    return httpResponse(req, res, reshttp.okCode, "Music deleted successfully");
  }),

  // Add review to music
  addReview: asyncHandler(async (req: _Request, res) => {
    const { id } = req.params;
    const data = req.body as ReviewData;

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const music = await db.music.findFirst({
      where: { id: Number(id) }
    });

    if (!music) {
      return httpResponse(req, res, reshttp.notFoundCode, "Music not found");
    }

    // Check if user has already reviewed this music
    const existingReview = await db.review.findFirst({
      where: {
        userId: user.id,
        musicId: music.id
      }
    });

    if (existingReview) {
      return httpResponse(req, res, reshttp.conflictCode, "You have already reviewed this music");
    }

    const review = await db.review.create({
      data: {
        rating: data.rating,
        content: data.content,
        userId: user.id,
        musicId: music.id
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

    logger.info(`Review added by user ${user.fullName} for music: ${music.title}`);
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

    const accessory = await db.music.findFirst({
      where: { id: Number(id) }
    });

    if (!accessory) {
      return httpResponse(req, res, reshttp.notFoundCode, "Music item not found");
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
