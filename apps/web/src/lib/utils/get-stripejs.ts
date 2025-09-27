/*
 * Filename: src/lib/utils/get-stripejs.ts
 * Purpose: Provides a singleton instance of the Stripe.js client for frontend operations.
 * Change History:
 * C001 - 2025-07-27 : 23:00 - Initial creation.
 * Last Modified: 2025-07-27 : 23:00
 * Requirement ID (optional): VIN-API-002
 * Change Summary: This utility was created as per Stripe's best practices to resolve "Module
 * not found" errors. It implements a singleton pattern to ensure that the Stripe.js
 * library is loaded only once per page visit, improving performance and providing a
 * consistent client instance to all components that need it.
 * Impact Analysis: This is an additive change that improves the architecture of the Stripe
 * integration. It fixes a critical build error on the Payments page.
 * Dependencies: "@stripe/stripe-js".
 */
import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error("Stripe publishable key is not set in environment variables.");
    }
    // The loadStripe function is called with your public key to initialize Stripe.js
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export default getStripe;