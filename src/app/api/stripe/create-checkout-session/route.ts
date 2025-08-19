/*
 * Filename: src/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C006 - 2025-08-14 : 15:00 - Definitive fix for critical TypeScript and syntax errors.
 * C005 - 2025-08-14 : 14:00 - Implemented resilient polling of Clerk's API for new users.
 * C004 - 2025-08-14 : 10:00 - Added customer_id to the success_url to enable stateless polling.
 * Last Modified: 2025-08-14 : 15:00
 * Requirement ID: VIN-API-003
 * Change Summary: This is the definitive fix for the build-blocking TypeScript errors. The code now correctly `await`s the `clerkClient()` promise to get the SDK instance before using it. A syntax error in the catch block's ternary operator has also been corrected, resolving all compilation issues and making the API fully functional.
 * Impact Analysis: This change fixes a critical deployment blocker and ensures the backend logic for adding a new card is executable and robust.
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

// Helper function to wait for a specified duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // --- THIS IS THE FIX for "Property 'users' does not exist..." ---
    // We must await the promise to get the actual client instance.
    const client = await clerkClient();
    let user;
    let stripeCustomerId: string | undefined;

    // Poll for the user's metadata to ensure the webhook has completed.
    for (let i = 0; i < 5; i++) { // Poll up to 5 times
      user = await client.users.getUser(userId);
      stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;
      if (stripeCustomerId) {
        break; // Customer ID found, exit loop
      }
      console.log(`[API/create-checkout-session] Attempt ${i + 1}: Stripe Customer ID not found for user ${userId}. Waiting...`);
      await sleep(1000); // Wait 1 second before retrying
    }

    if (!stripeCustomerId) {
      console.error(`[API/create-checkout-session] CRITICAL: Stripe Customer ID not found for user ${userId} after multiple retries.`);
      return new NextResponse(
        JSON.stringify({ error: "Your account is not fully configured for payments. Please try again in a moment or contact support." }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Now, we are confident we have the correct customer ID.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success&customer_id=${stripeCustomerId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("[API/create-checkout-session] CRITICAL ERROR:", error);
    
    // --- THIS IS THE FIX for the syntax errors ---
    // The string was missing backticks (`) to make it a template literal.
    const errorMessage = error instanceof Stripe.errors.StripeError
      ? `Stripe Error: ${error.message}`
      : "An internal server error occurred.";

    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}