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
    const data = req.body as Order & {
      shippingCost?: number;
      selectedShippingService?: string;
      estimatedDeliveryDays?: number;
    };
    const userId = req.userFromToken?.id;

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    // 🔎 Fetch cart with product relations to validate products exist
    const cartItems = await db.cart.findMany({
      where: { userId },
      include: {
        music: {
          where: { isDelete: false } // Only get non-deleted products
        },
        digitalBook: {
          where: { isDelete: false }
        },
        fashion: {
          where: { isDelete: false }
        },
        meditation: {
          where: { isDelete: false }
        },
        decoration: {
          where: { isDelete: false }
        },
        living: {
          where: { isDelete: false }
        },
        accessories: {
          where: { isDelete: false }
        }
      }
    });

    if (cartItems.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "Cart is empty");
    }

    // 🔍 Validate stock availability before processing order
    const stockValidationItems = cartItems
      .map((item) => {
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
      })
      .filter((item) => item.productId && item.productCategory) as Array<{ productId: number; productCategory: ProductCategory; quantity: number }>;

    // Validate stock availability
    const stockValidation = await InventoryService.validateStockAvailability(stockValidationItems);
    if (!stockValidation.valid) {
      return httpResponse(req, res, reshttp.badRequestCode, "Insufficient stock for some items", {
        errors: stockValidation.errors
      });
    }

    // 🧮 Calculate total and validate products exist
    let totalAmount = 0;
    const orderItemsData = cartItems
      .map((item) => {
        let category: ProductCategory | null = null;
        let productId: number | null = null;
        let vendorId: string | null = null;
        let price = 0;
        let productExists = false;

        if (item.musicId && item.music) {
          category = "MUSIC";
          productId = item.musicId;
          vendorId = item.music.userId ?? null;
          price = item.music.price ?? 0;
          productExists = !!item.music;
        } else if (item.bookId && item.digitalBook) {
          category = "DIGITAL_BOOK";
          productId = item.bookId;
          vendorId = item.digitalBook.userId ?? null;
          price = item.digitalBook.price ?? 0;
          productExists = !!item.digitalBook;
        } else if (item.fashionId && item.fashion) {
          category = "FASHION";
          productId = item.fashionId;
          vendorId = item.fashion.userId ?? null;
          price = item.fashion.price ?? 0;
          productExists = !!item.fashion;
        } else if (item.meditationId && item.meditation) {
          category = "MEDITATION";
          productId = item.meditationId;
          vendorId = item.meditation.userId ?? null;
          price = item.meditation.price ?? 0;
          productExists = !!item.meditation;
        } else if (item.decorationId && item.decoration) {
          category = "DECORATION";
          productId = item.decorationId;
          vendorId = item.decoration.userId ?? null;
          price = item.decoration.price ?? 0;
          productExists = !!item.decoration;
        } else if (item.livingId && item.living) {
          category = "HOME_LIVING";
          productId = item.livingId;
          vendorId = item.living.userId ?? null;
          price = item.living.price ?? 0;
          productExists = !!item.living;
        } else if (item.accessoriesId && item.accessories) {
          category = "ACCESSORIES";
          productId = item.accessoriesId;
          vendorId = item.accessories.userId ?? null;
          price = item.accessories.price ?? 0;
          productExists = !!item.accessories;
        }

        if (!category || !productId || !vendorId || !productExists) {
          logger.warn(`Invalid cart item - missing product or vendor info:`, {
            cartItemId: item.id,
            musicId: item.musicId,
            bookId: item.bookId,
            fashionId: item.fashionId,
            hasMusic: !!item.music,
            hasDigitalBook: !!item.digitalBook,
            hasFashion: !!item.fashion
          });
          return null;
        }

        const subtotal = price * item.qty;
        totalAmount += subtotal;

        return {
          category,
          productId,
          vendorId,
          quantity: item.qty,
          price
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (orderItemsData.length === 0) {
      return httpResponse(req, res, reshttp.badRequestCode, "No valid products found in cart. Please check your cart items.");
    }

    // 🔍 Final validation: Verify all products still exist in database before order creation
    const productValidationErrors: string[] = [];
    for (const item of orderItemsData) {
      try {
        let productExists = false;
        switch (item.category) {
          case "MUSIC": {
            const music = await db.music.findFirst({ where: { id: item.productId, isDelete: false } });
            productExists = !!music;
            break;
          }
          case "DIGITAL_BOOK": {
            const book = await db.digitalBook.findFirst({ where: { id: item.productId, isDelete: false } });
            productExists = !!book;
            break;
          }
          case "FASHION": {
            const fashion = await db.fashion.findFirst({ where: { id: item.productId, isDelete: false } });
            productExists = !!fashion;
            break;
          }
          case "MEDITATION": {
            const meditation = await db.meditation.findFirst({ where: { id: item.productId, isDelete: false } });
            productExists = !!meditation;
            break;
          }
          case "DECORATION": {
            const decoration = await db.decoration.findFirst({ where: { id: item.productId, isDelete: false } });
            productExists = !!decoration;
            break;
          }
          case "HOME_LIVING": {
            const homeLiving = await db.homeAndLiving.findFirst({ where: { id: item.productId, isDelete: false } });
            productExists = !!homeLiving;
            break;
          }
          case "ACCESSORIES": {
            const accessories = await db.accessories.findFirst({ where: { id: item.productId, isDelete: false } });
            productExists = !!accessories;
            break;
          }
        }

        if (!productExists) {
          productValidationErrors.push(`Product ID ${item.productId} (${item.category}) no longer exists or was deleted`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
        productValidationErrors.push(`Error validating product ID ${item.productId} (${item.category}): ${errorMessage}`);
      }
    }

    if (productValidationErrors.length > 0) {
      logger.warn("Product validation failed before order creation:", {
        userId,
        errors: productValidationErrors,
        orderItems: orderItemsData.map((i) => ({ category: i.category, productId: i.productId }))
      });
      return httpResponse(
        req,
        res,
        reshttp.badRequestCode,
        "One or more products in your cart no longer exist or were deleted. Please update your cart and try again.",
        {
          error: "Product validation failed",
          message: "Some products in your cart may have been deleted",
          suggestion: "Please refresh your cart and remove any invalid items",
          details: productValidationErrors
        }
      );
    }

    // 🚚 Get shipping details from frontend
    const shippingCost = data.shippingCost || 0;
    const selectedShippingService = data.selectedShippingService || "";
    const estimatedDeliveryDays = data.estimatedDeliveryDays || 0;

    // Calculate final total amount including shipping
    const finalTotalAmount = totalAmount + shippingCost;

    // 🔑 Stripe Customer - Get or Create
    let customerId = (user as unknown as { customer_id: string | null }).customer_id;
    let customer;

    // If customer_id exists, try to retrieve it
    if (customerId) {
      try {
        customer = await stripe.customers.retrieve(customerId, {
          expand: ["invoice_settings.default_payment_method"]
        });

        // Check if customer was deleted
        if ("deleted" in customer && customer.deleted) {
          logger.warn(`Stripe customer ${customerId} was deleted, creating new customer`, { userId });
          customerId = null; // Reset to create new customer
        }
      } catch (error) {
        // If customer doesn't exist (resource_missing error), create a new one
        if (error && typeof error === "object" && "code" in error && error.code === "resource_missing") {
          const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
          logger.warn(`Stripe customer ${customerId} not found, creating new customer`, {
            userId,
            error: errorMessage
          });
          customerId = null; // Reset to create new customer
        } else {
          // Re-throw other errors
          logger.error("Error retrieving Stripe customer:", {
            error: error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error),
            customerId,
            userId
          });
          throw error;
        }
      }
    }

    // Create customer if it doesn't exist or was deleted
    if (!customerId || !customer) {
      try {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || undefined,
          metadata: { userId: String(user.id) }
        });
        customerId = newCustomer.id;

        // Update user with new customer_id
        await db.user.update({
          where: { id: user.id },
          data: { customer_id: customerId } as unknown as Prisma.UserUpdateInput
        });

        logger.info(`Created new Stripe customer for user ${userId}`, { customerId });

        // Retrieve the newly created customer with expanded payment method
        customer = await stripe.customers.retrieve(customerId, {
          expand: ["invoice_settings.default_payment_method"]
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
        logger.error("Error creating Stripe customer:", {
          error: errorMessage,
          userId
        });
        return httpResponse(req, res, reshttp.internalServerErrorCode, "Failed to create Stripe customer. Please try again.");
      }
    }

    // Type guard: ensure customer is not deleted
    if ("deleted" in customer && customer.deleted) {
      return httpResponse(req, res, reshttp.badRequestCode, "Customer no longer exists in Stripe");
    }

    // Check if customer has a default payment method
    if (!customer || typeof customer !== "object" || !("invoice_settings" in customer)) {
      return httpResponse(req, res, reshttp.badRequestCode, "Invalid customer data");
    }

    const defaultPm = customer.invoice_settings?.default_payment_method;
    if (!defaultPm) {
      return httpResponse(req, res, reshttp.badRequestCode, "No default payment method found. Please add a payment method first.");
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalTotalAmount * 100),
        currency: "usd",
        customer: customerId,
        payment_method: typeof defaultPm === "string" ? defaultPm : defaultPm.id,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        confirm: true,
        metadata: {
          userId: user.id.toString(),
          email: user.email,
          cartOrderData: JSON.stringify(orderItemsData),
          amount: finalTotalAmount,
          shippingCost: shippingCost,
          selectedShippingService: selectedShippingService,
          estimatedDeliveryDays: estimatedDeliveryDays,
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
      // Normalize country code to uppercase (case-insensitive)
      const normalizedCountry = data.country ? String(data.country).trim().toUpperCase() : undefined;

      try {
        const newOrder = await db.order.create({
          data: {
            userId: user.id,
            amount: finalTotalAmount,
            sPaymentIntentId: paymentIntent.id,
            paymentStatus: "PENDING", // always pending until webhook flips it
            shippingCost: shippingCost,
            selectedShippingService: selectedShippingService,
            estimatedDeliveryDays: estimatedDeliveryDays,
            items: {
              create: orderItemsData.map((item) => ({
                category: item.category,
                productId: item.productId,
                vendorId: item.vendorId,
                quantity: item.quantity,
                price: item.price
                // Note: Product relations (music, fashion, etc.) are implicit via productId
                // Prisma automatically creates the relation based on productId matching the id in the respective table
                // No need to use connect - the foreign key constraint ensures the product exists
              }))
            },
            zip: data.zip,
            phone: data.phone,
            fullName: data.fullName,
            shippingAddress: data.shippingAddress,
            country: normalizedCountry
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
          logger.error(`Error reserving stock for order ${newOrder.id}: ${String(error)}`);
          // Continue with order creation even if stock reservation fails
          // This ensures the order is created and can be handled manually if needed
        }

        // Clear cart
        await db.cart.deleteMany({ where: { userId } });
      } catch (error) {
        logger.error("Error creating order:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          orderItemsData: orderItemsData.map((item) => ({
            category: item.category,
            productId: item.productId,
            vendorId: item.vendorId
          })),
          cartItems: cartItems.map((c) => ({
            id: c.id,
            musicId: c.musicId,
            fashionId: c.fashionId,
            hasMusic: !!c.music,
            hasFashion: !!c.fashion
          }))
        });

        // Check if it's a foreign key constraint error
        if (error && typeof error === "object" && "code" in error && error.code === "P2003") {
          return httpResponse(
            req,
            res,
            reshttp.badRequestCode,
            "One or more products in your cart no longer exist or were deleted. Please update your cart and try again.",
            {
              error: "Product foreign key constraint violation",
              message: "Some products in your cart may have been deleted",
              suggestion: "Please refresh your cart and remove any invalid items"
            }
          );
        }

        // Re-throw other errors to be handled by outer try-catch
        throw error;
      }
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
        // Normalize country code to uppercase (case-insensitive)
        const normalizedCountry = data.country ? String(data.country).trim().toUpperCase() : "US";

        await stripe.customers.update(user.customer_id, {
          name: data.fullName,
          phone: data.phone,
          address: {
            line1: data.address,
            postal_code: data.zip,
            country: normalizedCountry
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
