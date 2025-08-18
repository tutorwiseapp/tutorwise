/*
 * Filename: src/app/api/stripe/set-default-card/route.ts
 * Purpose: Securely sets a user's default payment method in Stripe.
 * Change History:
 * C003 - 2025-08-12 : 18:00 - Definitive fix with robust error handling.
 * C002 - 2025-08-10 : 04:00 - Definitive fix for async/await error.
 * C001 - 2025-08-10 : 03:00 - Initial creation.
 * Last Modified: 2025-08-12 : 18:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the set default card functionality. The route now includes a full try/catch block and specific error handling for Stripe API errors. It returns clear JSON errors to the frontend, ensuring the user is properly notified if the action fails.
 * Impact Analysis: This change makes the backend for setting a default card reliable and secure.
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized: You must be logged in." }), { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return new NextResponse(JSON.stringify({ error: "Bad Request: Payment Method ID is required." }), { status: 400 });
    }
    
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
        return new NextResponse(JSON.stringify({ error: "Stripe customer not found for this user." }), { status: 404 });
    }

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[API/set-default-card] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
        ? `Stripe Error: ${error.message}` 
        : "An internal server error occurred.";
    
    const status = error instanceof Stripe.errors.StripeInvalidRequestError ? 400 : 500;

    return new NextResponse(JSON.stringify({ error: errorMessage }), { status });
  }
}