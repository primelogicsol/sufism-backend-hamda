import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TWishlist } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
  addToWishlist: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TWishlist;
    const user = await db.user.findFirst({
      where: { id: req.userFromToken?.id }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const product = await db.product.findUnique({ where: { id: data.productId } });
    if (!product) {
      return httpResponse(req, res, reshttp.notFoundCode, "Product not found");
    }
    const existingItem = await db.wishlist.findFirst({
      where: { userId: user.id, productId: data.productId }
    });
    let WishlistItem;
    if (existingItem) {
      return httpResponse(req, res, reshttp.badRequestCode, `Already in wishlist`);
    } else {
      WishlistItem = await db.wishlist.create({
        data: {
          userId: user.id,
          productId: data.productId
        }
      });
    }

    return httpResponse(req, res, reshttp.okCode, "Item added to Wishlist", WishlistItem);
  }),
  deleteWishlistItem: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const { id } = req.params;

    if (!id) {
      return httpResponse(req, res, reshttp.badRequestCode, "Missing  productId");
    }

    const existingItem = await db.wishlist.findFirst({
      where: { userId, productId: Number(id) }
    });

    if (!existingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found in Wishlist");
    }

    await db.wishlist.delete({
      where: { id: existingItem.id, userId: userId }
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
    const Wishlist = await db.wishlist.findMany({
      where: { userId }
    });

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, Wishlist);
  })
};
