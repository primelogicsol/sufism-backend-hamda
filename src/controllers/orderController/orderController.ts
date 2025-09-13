/* eslint-disable camelcase */
import { ProductCategory } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import stripe from "../../services/payment/stripe.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";

export default {
  createOrder: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // 🔎 Fetch all items from cart
    const cartItems = await db.cart.findMany({
      where: { userId },
      include: {
        music: true,
        digitalBook: true,
        fashion: true,
        meditation: true,
        decoration: true,
        living: true,
        accessories: true
      }
    });

    if (cartItems.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "Cart is empty");
    }

    let totalAmount = 0;
    const orderItemsData = cartItems
      .map((item) => {
        let category: ProductCategory | null = null;
        let productId: number | null = null;
        let price = 0;

        if (item.musicId) {
          category = ProductCategory.MUSIC;
          productId = item.musicId;
          price = item.music?.price ?? 0;
        } else if (item.bookId) {
          category = ProductCategory.DIGITAL_BOOK;
          productId = item.bookId;
          price = item.digitalBook?.price ?? 0;
        } else if (item.fashionId) {
          category = ProductCategory.FASHION;
          productId = item.fashionId;
          price = item.fashion?.price ?? 0;
        } else if (item.meditationId) {
          category = ProductCategory.MEDITATION;
          productId = item.meditationId;
          price = item.meditation?.price ?? 0;
        } else if (item.decorationId) {
          category = ProductCategory.DECORATION;
          productId = item.decorationId;
          price = item.decoration?.price ?? 0;
        } else if (item.livingId) {
          category = ProductCategory.HOME_LIVING;
          productId = item.livingId;
          price = item.living?.price ?? 0;
        } else if (item.accessoriesId) {
          category = ProductCategory.ACCESSORIES;
          productId = item.accessoriesId;
          price = item.accessories?.price ?? 0;
        }

        if (!category || !productId) return null;

        const subtotal = price * item.qty;
        totalAmount += subtotal;

        return {
          category,
          productId,
          quantity: item.qty,
          price
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: "usd",
        metadata: {
          userId: user.id.toString(),
          email: user.email
        },
        automatic_payment_methods: { enabled: true }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";

      return httpResponse(req, res, reshttp.badRequestCode, `Stripe payment creation failed: ${msg}`);
    }

    const order = await db.order.create({
      data: {
        userId: user.id,
        amount: totalAmount,
        status: "PENDING",
        stripePaymentId: paymentIntent.id,
        items: {
          create: orderItemsData.map((item) => ({
            category: item.category,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { items: true }
    });

    await db.cart.deleteMany({ where: { userId } });

    return httpResponse(req, res, reshttp.okCode, "Order created successfully. Proceed to payment.", {
      order,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  })
};
