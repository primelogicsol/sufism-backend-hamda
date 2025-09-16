// configs/stripe.ts
import Stripe from "stripe";
import { STRIPE_SK } from "../../configs/config.js";

if (!STRIPE_SK) {
  // Fail fast at startup if the key is missing
  throw new Error("Stripe secret key (STRIPE_SK) is not configured");
}

const stripe = new Stripe(STRIPE_SK);

export default stripe;
