/*
 * Filename: src/api/stripe/remove-card/route.ts
 * Purpose: Securely removes/detaches a user's saved payment method in Stripe.
 * Change History:
 * C003 - 2025-07-31 : 13:00 - Migrate to Kinde.
 * C002 - 2025-08-12 : 18:00 - Definitive fix with robust error handling.
 * C001 - 2025-08-10 : 03:00 - Initial creation.
 * Last Modified: 2025-08-12 : 18:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the remove card functionality. The route now includes a full try/catch block with specific error handling for Stripe API errors. It will now return a meaningful JSON error response to the frontend if the detach operation fails, ensuring the user receives correct feedback.
 * Impact Analysis: This makes the backend for the "Remove card" feature robust and reliable.
 */
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized: You must be logged in." }), { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return new NextResponse(JSON.stringify({ error: "Bad Request: Payment Method ID is required." }), { status: 400 });
    }

    const detachedPaymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    return NextResponse.json({ success: true, detachedId: detachedPaymentMethod.id });
  } catch (error) {
    console.error("[API/remove-card] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
        ? `Stripe Error: ${error.message}` 
        : "An internal server error occurred.";
    const status = error instanceof Stripe.errors.StripeInvalidRequestError ? 400 : 500;
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status });
  }
}