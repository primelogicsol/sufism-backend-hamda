import stripe from "../services/payment/stripe.js";

interface User {
  email: string;
  fullName: string;
  id: string;
}
// Call this when a new user registers
export async function createStripeCustomer(user: User) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.fullName,
    // optional: store metadata (e.g. your userId)
    metadata: {
      userId: user.id
    }
  });

  // Save customer.id in your DB
  // e.g. UPDATE users SET stripeCustomerId = customer.id WHERE id = user.id
  return customer.id;
}
