import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import type { TCART } from "../../types/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
  addToCart: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TCART;
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
    if (product.stock < data.qty) {
      return httpResponse(req, res, reshttp.badRequestCode, `Not enough stock. Only ${product.stock} items available.`);
    }

    const existingItem = await db.cart.findFirst({
      where: { userId: user.id, productId: data.productId }
    });

    let cartItem;
    if (existingItem) {
      const newQuantity = existingItem.qty + data.qty;
      if (product.stock < newQuantity) {
        return httpResponse(req, res, reshttp.badRequestCode, `Not enough stock. Only ${product.stock} items available.`);
      }
      cartItem = await db.cart.update({
        where: { id: existingItem.id },
        data: {
          qty: existingItem.qty + data.qty
        }
      });
    } else {
      cartItem = await db.cart.create({
        data: {
          userId: user.id,
          productId: data.productId,
          qty: data.qty
        }
      });
    }

    return httpResponse(req, res, reshttp.okCode, "Item added to cart", cartItem);
  }),
  deleteCartItem: asyncHandler(async (req: _Request, res) => {
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

    const existingItem = await db.cart.findFirst({
      where: { userId, productId: Number(id) }
    });

    if (!existingItem) {
      return httpResponse(req, res, reshttp.notFoundCode, "Item not found in cart");
    }

    await db.cart.delete({
      where: { id: existingItem.id, userId }
    });

    return httpResponse(req, res, reshttp.okCode, "Item removed from cart");
  }),
  clearCart: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    await db.cart.deleteMany({
      where: { userId }
    });

    return httpResponse(req, res, reshttp.okCode, "Cart cleared");
  }),
  viewCart: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({
      where: { id: userId }
    });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const cart = await db.cart.findMany({
      where: { userId }
    });

    return httpResponse(req, res, reshttp.okCode, reshttp.okMessage, cart);
  })
};
