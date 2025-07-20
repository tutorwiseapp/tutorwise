/*
 * Filename: src/lib/stripe.ts
 * Purpose: Initializes and exports a singleton Stripe client for server-side operations.
 *
 * Change History:
 * C002 - 2025-07-20 : 15:45 - Updated Stripe API version to match installed library types.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-20 : 15:45
 * Requirement ID (optional): VIN-API-002
 *
 * Change Summary:
 * The `apiVersion` has been updated from '2024-06-20' to '2025-06-30.basil'. This is required
 * to match the strict type definitions of the currently installed Stripe Node.js library,
 * and it resolves the TypeScript error that was causing the Vercel deployment to fail.
 *
 * Impact Analysis:
 * This change fixes a critical deployment blocker. It ensures that our server-side Stripe
 * interactions are correctly typed according to the installed package version.
 *
 * Dependencies: "stripe"
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in the environment variables.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // --- THIS IS THE FIX ---
  // The installed version of the 'stripe' library's types requires this specific version string.
  apiVersion: '2025-06-30.basil',
  typescript: true,
});