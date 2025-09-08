// /* eslint-disable camelcase */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// import reshttp from "reshttp";
// import Stripe from "stripe";
// import type { _Request } from "../../middleware/authMiddleware.js";
// import { httpResponse } from "../../utils/apiResponseUtils.js";
// import { asyncHandler } from "../../utils/asyncHandlerUtils.js";
// import logger from "../../utils/loggerUtils.js";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// export default {
//   createOrder: asyncHandler(async (req: _Request, resp) => {
//     try {
//       const { products } = req.body;

//       if (!products || !Array.isArray(products)) {
//         return httpResponse(req, resp, reshttp.badRequestCode, "Products are required");
//       }

//       const lineItems = products.map((product) => ({
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: product.name,
//             images: product.image ? [product.image] : [],
//           },
//           unit_amount: Math.round(product.price * 100),
//         },
//         quantity: product.quantity,
//       }));

//       const session = await stripe.checkout.sessions.create({
//         payment_method_types: ["card"],
//         line_items: lineItems,
//         mode: "payment",
//         success_url: process.env.SUCCESS_URL || "http://localhost:3000/success",
//         cancel_url: process.env.CANCEL_URL || "http://localhost:3000/cancel",
//       });

//       return httpResponse(req, resp, reshttp.okCode,reshttp.okMessage, { id: session.id });
//     } catch (e) {
//       logger.error("Error creating Stripe order:", e);
//       return httpResponse(
//         req,
//         resp,
//         reshttp.internalServerErrorCode,
//         "An error occurred, please try again"
//       );
//     }
//   }),
// };
