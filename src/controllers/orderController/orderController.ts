/* eslint-disable camelcase */
import type { Order, Prisma, ProductCategory } from "@prisma/client";
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { InventoryService } from "../../services/inventory.service.js";
import stripe from "../../services/payment/stripe.js";
import type { TBillingDetails } from "../../type/types.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
// Avoid importing Prisma enums as values to prevent error-typed unions in ESLint
// import type Stripe from "stripe";

export default {
  createOrder: asyncHandler(async (req: _Request, res) => {
    const data = req.body as Order;
    const userId = req.userFromToken?.id;

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // 🔎 Fetch cart
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

    // 🔍 Validate stock availability before processing order
    const stockValidationItems = cartItems.map(item => {
      let productId: number | null = null;
      let productCategory: ProductCategory | null = null;

      if (item.musicId) {
        productId = item.musicId;
        productCategory = "MUSIC";
      } else if (item.bookId) {
        productId = item.bookId;
        productCategory = "DIGITAL_BOOK";
      } else if (item.fashionId) {
        productId = item.fashionId;
        productCategory = "FASHION";
      } else if (item.meditationId) {
        productId = item.meditationId;
        productCategory = "MEDITATION";
      } else if (item.decorationId) {
        productId = item.decorationId;
        productCategory = "DECORATION";
      } else if (item.livingId) {
        productId = item.livingId;
        productCategory = "HOME_LIVING";
      } else if (item.accessoriesId) {
        productId = item.accessoriesId;
        productCategory = "ACCESSORIES";
      }

      return { productId, productCategory, quantity: item.qty };
    }).filter(item => item.productId && item.productCategory) as Array<{ productId: number; productCategory: ProductCategory; quantity: number }>;

    // Validate stock availability
    const stockValidation = await InventoryService.validateStockAvailability(stockValidationItems);
    if (!stockValidation.valid) {
      return httpResponse(req, res, reshttp.badRequestCode, "Insufficient stock for some items", {
        errors: stockValidation.errors
      });
    }

    // 🧮 Calculate total
    let totalAmount = 0;
    const orderItemsData = cartItems
      .map((item) => {
        let category: ProductCategory | null = null;
        let productId: number | null = null;
        let price = 0;

        if (item.musicId) {
          category = "MUSIC";
          productId = item.musicId;
          price = item.music?.price ?? 0;
        } else if (item.bookId) {
          category = "DIGITAL_BOOK";
          productId = item.bookId;
          price = item.digitalBook?.price ?? 0;
        } else if (item.fashionId) {
          category = "FASHION";
          productId = item.fashionId;
          price = item.fashion?.price ?? 0;
        } else if (item.meditationId) {
          category = "MEDITATION";
          productId = item.meditationId;
          price = item.meditation?.price ?? 0;
        } else if (item.decorationId) {
          category = "DECORATION";
          productId = item.decorationId;
          price = item.decoration?.price ?? 0;
        } else if (item.livingId) {
          category = "HOME_LIVING";
          productId = item.livingId;
          price = item.living?.price ?? 0;
        } else if (item.accessoriesId) {
          category = "ACCESSORIES";
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

    // 🔑 Stripe Customer
    const customerId = (user as unknown as { customer_id: string | null }).customer_id;
    if (!customerId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Missing Stripe customer ID");
    }

    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"]
    });

    if (customer.deleted) {
      return httpResponse(req, res, reshttp.badRequestCode, "Customer no longer exists in Stripe");
    }

    const defaultPm = customer.invoice_settings?.default_payment_method;
    if (!defaultPm) {
      return res.status(400).json({ error: "No default payment method found" });
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: "usd",
        customer: customerId,
        payment_method: typeof defaultPm === "string" ? defaultPm : defaultPm.id,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        confirm: true,
        metadata: {
          userId: user.id.toString(),
          email: user.email,
          cartOrderData: JSON.stringify(orderItemsData),
          amount: totalAmount,
          address: JSON.stringify(data)
        }
      });
    } catch (err: unknown) {
      if (err instanceof Error && "type" in err) {
        switch (err.type) {
          case "StripeCardError":
            // Handle card-related errors
            return httpResponse(req, res, reshttp.badRequestCode, `Payment error: ${err.message}`);
          case "StripeInvalidRequestError":
            // Handle invalid request errors
            return httpResponse(req, res, reshttp.badRequestCode, `Invalid request: ${err.message}`);
          default:
            // Handle other types of errors
            return httpResponse(req, res, reshttp.badRequestCode, `Stripe error: ${err.message}`);
        }
      } else {
        // Handle unexpected errors
        return httpResponse(req, res, reshttp.badRequestCode, "An unexpected error occurred");
      }
    }

    // 🛒 Create Order as PENDING
    if (paymentIntent.status === "succeeded") {
      const newOrder = await db.order.create({
        data: {
          userId: user.id,
          amount: totalAmount,
          sPaymentIntentId: paymentIntent.id,
          paymentStatus: "PENDING", // always pending until webhook flips it
          items: {
            create: orderItemsData.map((item) => ({
              category: item.category,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          },
          zip: data.zip,
          phone: data.phone,
          fullName: data.fullName,
          shippingAddress: data.shippingAddress,
          country: data.country
        } as unknown as Prisma.OrderCreateInput
      });

      // 📦 Reserve stock for the order
      try {
        const stockReservation = await InventoryService.reserveStock(stockValidationItems, newOrder.id, user.id);
        if (!stockReservation.success) {
          // If stock reservation fails, we should handle this gracefully
          logger.error(`Stock reservation failed for order ${newOrder.id}: ${stockReservation.errors.join(", ")}`);
          // Note: In a production system, you might want to cancel the order or handle this differently
        }
      } catch (error) {
        logger.error(`Error reserving stock for order ${newOrder.id}: ${error}`);
        // Continue with order creation even if stock reservation fails
        // This ensures the order is created and can be handled manually if needed
      }

      // Clear cart
      await db.cart.deleteMany({ where: { userId } });
    }

    // 🎯 Respond with client secret + status
    return httpResponse(req, res, reshttp.okCode, "Order created. Complete payment if required.", {
      clientSecret: paymentIntent.client_secret,
      paymentIntentStatus: paymentIntent.status
    });
  }),

  billingDetails: asyncHandler(async (req: _Request, res) => {
    const data = req.body as TBillingDetails;
    const user = await db.user.findFirst({ where: { id: req.userFromToken?.id } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    try {
      if (user.customer_id) {
        await stripe.customers.update(user.customer_id, {
          name: data.fullName,
          phone: data.phone,
          address: {
            line1: data.address,
            postal_code: data.zip,
            country: data.country ?? "US"
          }
        });
      }
      return httpResponse(req, res, reshttp.okCode, "Billing details updated successfully");
    } catch (error) {
      logger.error("Billing details error:", error);
      return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to update billing details");
    }
  })
};
