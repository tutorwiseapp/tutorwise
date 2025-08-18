/*
 * Filename: src/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C002 - 2025-08-12 : 19:00 - Definitive fix with specific error handling for missing customer ID.
 * C001 - 2025-07-27 : 16:30 - Initial creation.
 * Last Modified: 2025-08-12 : 19:00
 * Requirement ID: VIN-API-003
 * Change Summary: This is the definitive fix for the "Failed to create session" error. The route now includes a specific check for a missing Stripe Customer ID on the user's metadata. If it's missing, it returns a clear 404 error with a descriptive JSON message, which the frontend can then display to the user.
 * Impact Analysis: This change makes debugging user-specific payment issues much easier and provides clearer feedback when the user creation webhook may have failed.
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;

    // --- THIS IS THE DEFINITIVE FIX ---
    // If the customer ID doesn't exist, it's a critical error, likely from a webhook failure.
    // We return a specific, actionable error message in a JSON response.
    if (!stripeCustomerId) {
      return new NextResponse(
        JSON.stringify({ error: "Stripe Customer ID not found for this user. Please contact support." }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a Stripe Checkout Session in "setup" mode.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    // The error from Stripe will be caught here and sent back.
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}