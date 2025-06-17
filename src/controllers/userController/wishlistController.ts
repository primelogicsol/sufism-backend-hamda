import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { Wishlist } from "@prisma/client";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

// Define allowed category keys
type WishlistCategory = "music" | "book" | "fashion" | "meditation" | "decoration" | "living" | "accessories";

// Map category to field name in the Prisma Wishlist model
const categoryFieldMap: Record<WishlistCategory, keyof Wishlist> = {
  music: "musicId",
  book: "bookId",
  fashion: "fashionId",
  meditation: "meditationId",
  decoration: "decorationId",
  living: "livingId",
  accessories: "accessoriesId"
};

export default {
  addToWishlist: asyncHandler(async (req: _Request, res) => {
    const { category, productId } = req.body as {
      category: WishlistCategory;
      productId: number;
    };

    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const field = categoryFieldMap[category];

    // Check if item already exists
    const existingItem = await db.wishlist.findFirst({
      where: {
        userId: user.id,
        [field]: productId
      }
    });

    if (existingItem) {
      return httpResponse(req, res, reshttp.badRequestCode, "Already in wishlist");
    }

    // Create wishlist entry
    const wishlistItem = await db.wishlist.create({
      data: {
        userId: user.id,
        [field]: productId
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Item added to Wishlist", wishlistItem);
  }),

  deleteWishlistItem: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const { category, productId } = req.body as {
      category: WishlistCategory;
      productId: number;
    };

    const field = categoryFieldMap[category];

    const existingItem = await db.wishlist.findFirst({
      where: {
        userId,
        [field]: productId
      }
    });

    if (!existingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found in Wishlist");
    }

    await db.wishlist.delete({
      where: {
        id: existingItem.id
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Item removed from Wishlist");
  }),

  clearWishlist: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    await db.wishlist.deleteMany({
      where: { userId }
    });

    return httpResponse(req, res, reshttp.okCode, "Wishlist cleared");
  }),

  viewWishlist: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const wishlist = await db.wishlist.findMany({
      where: { userId },
      include: {
        music: true,
        digitalBook: true,
        meditation: true,
        fashion: true,
        living: true,
        decoration: true,
        accessories: true
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Wishlist fetched", wishlist);
  })
};
