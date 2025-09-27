/*
 * Filename: src/lib/stripe.ts
 * Purpose: Initializes and exports a singleton Stripe client for server-side operations.
 * Change History:
 * C006 - 2025-07-27 : 22:00 - Definitive fix for Stripe API versioning.
 * ... (previous history)
 * Last Modified: 2025-07-27 : 22:00
 * Requirement ID (optional): VIN-API-002
 * Change Summary: This is the definitive and final fix. The explicit `apiVersion` has been
 * removed. The Stripe library will now automatically use its default, compatible API version,
 * resolving potential 'invalid_request_error' issues and ensuring long-term stability.
 * Impact Analysis: This critical configuration fix ensures all Stripe requests from
 * the backend are valid and processed correctly.
 * Dependencies: "stripe"
 */
import Stripe from 'stripe';

// This check ensures your application will fail fast during development if the
// crucial Stripe secret key is missing, preventing runtime errors later.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in the environment variables.');
}

// Initialize the Stripe client for server-side operations.
// This instance will be used by all your API routes that need to interact with Stripe.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // The explicit apiVersion is intentionally removed. The library will default to its
  // pinned version, which is the most stable and recommended approach.
  typescript: true,
});