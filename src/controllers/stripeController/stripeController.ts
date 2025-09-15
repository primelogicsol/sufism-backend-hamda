/* eslint-disable camelcase */
import reshttp from "reshttp";
import { db } from "../../configs/database.js";
import type { _Request } from "../../middleware/authMiddleware.js";
import stripe from "../../services/payment/stripe.js";
import { httpResponse } from "../../utils/apiResponseUtils.js";
import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
import type Stripe from "stripe";
import { STRIPE_WEBHOOK_SECRET } from "../../configs/config.js";
const endpointSecret = STRIPE_WEBHOOK_SECRET;

export default {
  createSetupIntent: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;
    const user = await db.user.findFirst({ where: { id: userId } });

    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }
    let customerId = user.customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user.id }
      });
      customerId = customer.id;

      await db.user.update({ where: { id: user.id }, data: { customer_id: customerId } });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"]
    });

    return httpResponse(req, res, reshttp.okCode, "Card setup intent created", {
      client_secret: setupIntent.client_secret
    });
  }),

  // Fetch all saved payment methods for logged-in user
  getPaymentMethods: asyncHandler(async (req: _Request, res) => {
    const userId = req.userFromToken?.id;

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user) {
      return httpResponse(req, res, reshttp.unauthorizedCode, reshttp.unauthorizedMessage);
    }

    if (!user.customer_id) {
      return httpResponse(req, res, reshttp.badRequestCode, "No Stripe customer ID found for user");
    }

    const customer = await stripe.customers.retrieve(user.customer_id);
    const validCustomer = customer as Stripe.Customer;
    const defaultMethodId = validCustomer?.invoice_settings?.default_payment_method || null;
    // Retrieve all card payment methods for the Stripe customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.customer_id,
      type: "card"
    });

    return httpResponse(req, res, reshttp.okCode, "Payment methods retrieved", { defaultMethodId, paymentMethods: paymentMethods.data });
  }),

  setDefaultIfNone: asyncHandler(async (req: _Request, res) => {
    const { paymentMethodId } = req.body as { paymentMethodId: string };
    const userId = req.userFromToken?.id;

    const user = await db.user.findFirst({ where: { id: userId } });
    if (!user || !user.customer_id) {
      return httpResponse(req, res, reshttp.badRequestCode, "No customer found");
    }

    // const customer = await stripe.customers.retrieve(user.customer_id);

    // if (!customer.deleted && customer.invoice_settings.default_payment_method == null) {
    await stripe.customers.update(user.customer_id, {
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
        }
        break;
      }

      // Payment successful
      case "payment_intent.succeeded": {
        const paymentIntent: Stripe.PaymentIntent = event.data.object;
        // ✅ Mark order/donation as paid in DB using paymentIntent.id or metadata
        console.log("PaymentIntent succeeded:", paymentIntent.id);
        break;
      }

      // Payment failed
      case "payment_intent.payment_failed": {
        const paymentIntent: Stripe.PaymentIntent = event.data.object;
        console.log("PaymentIntent failed:", paymentIntent.id);
        // ❌ Update order status in DB if needed
        break;
      }

      // Optional refund handling
      case "charge.refunded": {
        const charge: Stripe.Charge = event.data.object;
        console.log("Charge refunded:", charge.id);
        // 🔄 Update your records
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  })
};
