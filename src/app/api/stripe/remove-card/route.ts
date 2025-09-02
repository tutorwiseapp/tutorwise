/*
 * Filename: src/app/api/stripe/remove-card/route.ts
 * Purpose: Securely removes/detaches a user's saved payment method in Stripe.
 * Change History:
 * C003 - 2025-09-02 : 20:00 - Migrated to use Supabase server client for authentication.
 * C002 - 2025-08-12 : 18:00 - Definitive fix with robust error handling.
 * C001 - 2025-08-10 : 03:00 - Initial creation.
 * Last Modified: 2025-09-02 : 20:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This API has been fully migrated to Supabase Auth. It uses the `createClient` to authenticate the request before detaching the card.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized: You must be logged in." }), { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
      return new NextResponse(JSON.stringify({ error: "Bad Request: Payment Method ID is required." }), { status: 400 });
    }

    const detachedPaymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    return NextResponse.json({ success: true, detachedId: detachedPaymentMethod.id });
  } catch (error) {
    const errorMessage = error instanceof Stripe.errors.StripeError ? `Stripe Error: ${error.message}` : "An internal server error occurred.";
    const status = error instanceof Stripe.errors.StripeInvalidRequestError ? 400 : 500;
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status });
  }
}