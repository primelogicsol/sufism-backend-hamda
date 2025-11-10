/* eslint-disable camelcase */
import type { Prisma, ProductCategory } from "@prisma/client";
import reshttp from "reshttp";
import type Stripe from "stripe";
import { STRIPE_WEBHOOK_SECRET } from "../../configs/config.js";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import { gloabalMailMessage } from "../../services/globalEmailMessageService.js";
import { InventoryService } from "../../services/inventory.service.js";
import stripe from "../../services/payment/stripe.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import logger from "../../utils/loggerUtils.js";
import messageSenderUtils from "../../utils/messageSenderUtils.js";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// Get this file’s directory (works in Bun/ESM)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Save stripe-logs.log in the same folder as this file
// const LOG_FILE = path.join(__dirname, "stripe-logs.log");

interface Address {
  zip: string;
  phone: string;
  fullName: string;
  shippingAddress: string;
  country: string;
}

const endpointSecret = STRIPE_WEBHOOK_SECRET;

export default {
  createSetupIntent: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    const userWithCustomer = user as unknown as { customer_id?: string | null };
    let customerId: string | null = userWithCustomer.customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: String(user.id) }
      });
      customerId = customer.id;

      await db.user.update({
        where: { id: user.id },
        data: { customer_id: customerId } as unknown as Prisma.UserUpdateInput
      });
    }

    if (!customerId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Stripe customer id missing");
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"]
    });

    return httpResponse(req, res, reshttp.okCode, "Card setup intent created", {
      client_secret: setupIntent.client_secret
    });
  }),

  createDonationIntent: asyncHandler(async (req: _Request, res) => {
    const { amount, pool, donorType }: { amount: string; pool: string[]; donorType: string } = req.body as {
      amount: string;
      pool: string[];
      donorType: string;
    };
    const userId = req.userFromToken?.id;
    if (!amount || !userId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Amount and userId are required");
    }

    // validate user exists
    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) {
      return httpResponse(req, res, reshttp.notFoundCode, "User not found");
    }

    // create payment intent (no customer ID, just direct payment)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // convert to cents
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: `Donation by ${user.fullName}`,
      metadata: {
        userId: user.id,
        donorName: user.fullName,
        donorEmail: user.email,
        donorType: donorType || "ONE_TIME",
        pool: Array.isArray(pool) ? pool.join(",") : pool || "SUFI_SCIENCE_CENTER"
      }
    });

    return httpResponse(req, res, reshttp.okCode, "Donation payment intent created", {
      client_secret: paymentIntent.client_secret
    });
  }),

  createEditIntent: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const userWithCustomer = user as unknown as { customer_id?: string | null };
    const customerId: string | null = userWithCustomer.customer_id ?? null;

    if (!customerId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Stripe customer id missing");
    }

    // 🔑 Create a new SetupIntent for updating card details
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"]
    });

    return httpResponse(req, res, reshttp.okCode, "Edit setup intent created", {
      client_secret: setupIntent.client_secret
    });
  }),

  deletePaymentMethod: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const { paymentMethodId } = req.body as { paymentMethodId: string };

    if (!paymentMethodId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Payment method id required");
    }

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const userWithCustomer = user as unknown as { customer_id?: string | null; default_payment_method?: string | null };
    const customerId = userWithCustomer.customer_id;

    if (!customerId) {
      return httpResponse(req, res, reshttp.badRequestCode, "Stripe customer id missing");
    }

    //  Detach payment method from Stripe
    await stripe.paymentMethods.detach(paymentMethodId);

    return httpResponse(req, res, reshttp.okCode, "Payment method deleted successfully");
  }),

  // Fetch all saved payment methods for logged-in user
  getPaymentMethods: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    const hasCustomerId = (user as unknown as { customer_id?: string | null }).customer_id;
    if (!hasCustomerId) {
      return httpResponse(req, res, reshttp.badRequestCode, "No Stripe customer ID found for user");
    }

    const userWithCustomer2 = user as unknown as { customer_id?: string | null };
    const stripeCustomerId = typeof userWithCustomer2.customer_id === "string" ? userWithCustomer2.customer_id : "";
    if (!stripeCustomerId) {
      return httpResponse(req, res, reshttp.badRequestCode, "No Stripe customer ID found for user");
    }
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    const validCustomer = customer as Stripe.Customer;
    const defaultPm = validCustomer?.invoice_settings?.default_payment_method;
    const defaultMethodId: string | null = typeof defaultPm === "string" ? defaultPm : (defaultPm?.id ?? null);
    // Retrieve all card payment methods for the Stripe customer
    const paymentMethods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: "card" });

    return httpResponse(req, res, reshttp.okCode, "Payment methods retrieved", { defaultMethodId, paymentMethods: paymentMethods.data });
  }),

  setDefaultIfNone: asyncHandler(async (req: _Request, res) => {
    const { paymentMethodId } = req.body as { paymentMethodId: string };
    const userId = req.userFromToken?.id;

    const user = await db.user.findFirst({ where: { id: userId } });
    const userWithCustomer4 = user as unknown as { customer_id?: string | null };
    if (!user || !userWithCustomer4.customer_id) {
      return httpResponse(req, res, reshttp.badRequestCode, "No customer found");
    }

    // const customer = await stripe.customers.retrieve(user.customer_id);

    // if (!customer.deleted && customer.invoice_settings.default_payment_method == null) {
    const userWithCustomer3 = user as unknown as { customer_id?: string | null };
    const stripeCustomerId2 = typeof userWithCustomer3.customer_id === "string" ? userWithCustomer3.customer_id : "";
    if (!stripeCustomerId2) {
      return httpResponse(req, res, reshttp.badRequestCode, "No Stripe customer ID found for user");
    }
    await stripe.customers.update(stripeCustomerId2, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });
    // }

    return httpResponse(req, res, reshttp.okCode, "Checked/Updated default payment method");
  }),

  // Stripe webhook handler
  webhook: asyncHandler(async (req: _Request, res) => {
    console.log("Type of req.body:", typeof req.body);
    console.log("Is Buffer:", Buffer.isBuffer(req.body));

    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(req.body as Buffer, sig, endpointSecret);
    } catch (err) {
      console.log(err);

      const message = err instanceof Error ? err.message : "Unknown error";
      return httpResponse(req, res, reshttp.badGatewayCode, `Webhook Error: ${message}`);
    }

    switch (event.type) {
      // Card setup successful
      case "setup_intent.succeeded": {
        if (event.data.object.object === "setup_intent") {
          const setupIntent: Stripe.SetupIntent = event.data.object;
          const customerId = setupIntent.customer as string;
          const paymentMethodId = setupIntent.payment_method as string;
          const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
          if (!customer.invoice_settings.default_payment_method) {
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId }
            });
          }
          //  try {
          //  await gloabalMailMessage(setupIntent?.metadata.email, messageSenderUtils.orderSuccessMessage(orderId));
          // } catch (e) {
          //     logger.error(e);
          //  }
        }
        break;
      }

      // Payment successful
      case "payment_intent.succeeded": {
        // ✅ Mark order/donation as paid in DB using paymentIntent.id or metadata
        const paymentIntent: Stripe.PaymentIntent = event.data.object;

        const { id, metadata, status } = paymentIntent;
        const order = await db.order.findFirst({
          where: {
            sPaymentIntentId: id
          }
        });

        if (order) {
          await db.order.updateMany({
            where: {
              userId: metadata.userId,
              sPaymentIntentId: id
            },
            data: {
              paymentStatus: status === "succeeded" ? "PAID" : "FAILED"
            }
          });
          try {
            await gloabalMailMessage(
              metadata.email,
              messageSenderUtils.orderSuccessMessage(order.id.toString(), (paymentIntent.amount / 100).toFixed(2))
            );
          } catch (e) {
            logger.error(e);
          }
        } else {
          const orderData = JSON.parse(metadata.cartOrderData) as Array<{
            category: string;
            productId: number;
            vendorId: string;
            quantity: number;
            price: number;
          }>;
          const address = JSON.parse(metadata.address) as Address;

          try {
            const newOrder = await db.order.create({
              data: {
                userId: metadata.userId,
                amount: Number((paymentIntent.amount / 100).toFixed(2)),
                sPaymentIntentId: paymentIntent.id,
                paymentStatus: "PAID", // always pending until webhook flips it
                shippingCost: metadata.shippingCost ? Number(metadata.shippingCost) : 0,
                selectedShippingService: metadata.selectedShippingService || "",
                estimatedDeliveryDays: metadata.estimatedDeliveryDays ? Number(metadata.estimatedDeliveryDays) : 0,
                items: {
                  create: orderData.map((item) => ({
                    category: item.category,
                    productId: item.productId,
                    vendorId: item.vendorId,
                    quantity: item.quantity,
                    price: item.price
                  }))
                },
                zip: address.zip,
                phone: address.phone,
                fullName: address.fullName,
                shippingAddress: address.shippingAddress,
                country: address.country
              } as unknown as Prisma.OrderCreateInput
            });

            console.log("<><><odd", newOrder.id);

            // 📦 Reserve stock for the confirmed order
            try {
              const stockReservationItems = orderData.map((item) => ({
                productId: item.productId,
                productCategory: item.category as ProductCategory,
                quantity: item.quantity
              }));

              const stockReservation = await InventoryService.reserveStock(stockReservationItems, newOrder.id, metadata.userId);
              if (!stockReservation.success) {
                logger.error(`Stock reservation failed for order ${newOrder.id}: ${stockReservation.errors.join(", ")}`);
              }
            } catch (error) {
              logger.error(`Error reserving stock for order ${newOrder.id}: ${String(error)}`);
            }

            await db.cart.deleteMany({ where: { userId: metadata.userId } });
            try {
              await gloabalMailMessage(
                metadata.email,
                messageSenderUtils.orderSuccessMessage(newOrder.id.toString(), (paymentIntent.amount / 100).toFixed(2))
              );
            } catch (e) {
              logger.error(e);
            }
          } catch (error) {
            logger.error(error);
            console.log(error);
          }

          // Clear cart
        }

        // logStripeEvent(paymentIntent);
        break;
      }

      // Payment failed
      case "payment_intent.payment_failed": {
        const paymentIntent: Stripe.PaymentIntent = event.data.object;
        const { id, metadata, last_payment_error } = paymentIntent;
        console.log(last_payment_error?.message);

        // Find the order to release reserved stock
        const failedOrder = await db.order.findFirst({
          where: {
            userId: metadata.userId,
            sPaymentIntentId: id
          },
          include: {
            items: true
          }
        });

        // Release reserved stock if order exists
        if (failedOrder) {
          try {
            const stockReleaseItems = failedOrder.items.map((item) => ({
              productId: item.productId,
              productCategory: item.category,
              quantity: item.quantity
            }));

            await InventoryService.releaseStock(stockReleaseItems, failedOrder.id, metadata.userId, "Payment failed");
          } catch (error) {
            logger.error(`Error releasing stock for failed order ${failedOrder.id}: ${String(error)}`);
          }
        }

        await db.order.updateMany({
          where: {
            userId: metadata.userId,
            sPaymentIntentId: id
          },
          data: {
            paymentStatus: "FAILED"
          }
        });
        try {
          await gloabalMailMessage(metadata.email, messageSenderUtils.orderFailureMessage(last_payment_error?.message ?? "Unknown payment error"));
        } catch (e) {
          logger.error(e);
        }
        // logStripeEvent(paymentIntent);
        break;
      }

      // Optional refund handling
      case "charge.refunded": {
        const charge: Stripe.Charge = event.data.object;
        console.log("charge_refund_event", charge);

        // logStripeEvent(charge);
        // 🔄 Update your records
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  })
};

// function logStripeEvent(event: unknown) {
//   const timestamp = new Date().toISOString();
//   const formatted = `[${timestamp}] ${JSON.stringify(event, null, 2)}\n\n`;

//   // Print to terminal
//   console.log("🔔 Stripe Event:", formatted);

//   // Save to file
//   fs.appendFileSync(LOG_FILE, formatted, "utf-8");
// }
