import type { Cart } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

// Define allowed category keys
type CartCategory = "music" | "book" | "fashion" | "meditation" | "decoration" | "living" | "accessories";

// Category to Prisma field mapping
const categoryFieldMap: Record<CartCategory, keyof Cart> = {
  music: "musicId",
  book: "bookId",
  fashion: "fashionId",
  meditation: "meditationId",
  decoration: "decorationId",
  living: "livingId",
  accessories: "accessoriesId"
};

export default {
  // 🛒 Add to Cart
  addToCart: asyncHandler(async (req: _Request, res) => {
    const {
      category,
      productId,
      qty = 1
    } = req.body as {
      category: CartCategory;
      productId: number;
      qty?: number;
    };

    const user = await db.user.findFirst({ where: { id: req.userFromToken?.id } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const field = categoryFieldMap[category];

    const existingItem = await db.cart.findFirst({
      where: {
        userId: user.id,
        [field]: productId
      }
    });

    if (existingItem) {
      return httpResponse(req, res, reshttp.badRequestCode, "Already in cart");
    }

    const cartItem = await db.cart.create({
      data: {
        userId: user.id,
        qty,
        [field]: productId
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Item added to cart", cartItem);
  }),

  //  Delete Cart Item
  deleteCartItem: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const { category, productId } = req.body as {
      category: CartCategory;
      productId: number;
    };

    const field = categoryFieldMap[category];

    const existingItem = await db.cart.findFirst({
      where: {
        userId,
        [field]: productId
      }
    });

    if (!existingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found in cart");
    }

    await db.cart.delete({
      where: {
        id: existingItem.id
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Item removed from cart");
  }),

  //  Clear Cart
  clearCart: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    await db.cart.deleteMany({ where: { userId } });

    return httpResponse(req, res, reshttp.okCode, "Cart cleared");
  }),

  //  View Cart
  viewCart: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const cartItems = await db.cart.findMany({
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

    return httpResponse(req, res, reshttp.okCode, "Cart fetched", cartItems);
  }),

  //  Update Cart Item Quantity
  updateCartItem: asyncHandler(async (req: _Request, res) => {
    const { category, productId, qty } = req.body as {
      category: CartCategory;
      productId: number;
      qty: number;
    };

    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!productId || qty < 1) {
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid quantity or productId");
    }

    const field = categoryFieldMap[category];

    const existingItem = await db.cart.findFirst({
      where: {
        userId,
        [field]: productId
      }
    });

    if (!existingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found in cart");
    }

    const updatedItem = await db.cart.update({
      where: { id: existingItem.id },
      data: { qty }
    });

    return httpResponse(req, res, reshttp.okCode, "Cart item updated", updatedItem);
  })
};
