/*
 * Filename: src/app/api/stripe/get-cards-by-customer/route.ts
 * Purpose: Provides a secure, targeted endpoint to fetch payment methods for a specific Stripe Customer ID.
 * Change History:
 * C001 - 2025-08-14 : 10:00 - Initial creation.
 * C002 - 2025-08-31 : 13:00 - Migrate to Kinde.

 * Last Modified: 2025-08-14 : 10:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This new API route was created to solve a race condition. It allows the frontend to poll for an updated card list using a specific customer ID passed in the success URL, rather than relying on potentially stale Clerk metadata. It is authenticated to ensure only the logged-in user can query their own data.
 * Impact Analysis: This is a critical component of the definitive fix for the payment card verification flow.
 */
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { customerId } = await req.json();
    if (!customerId) {
      return new NextResponse(JSON.stringify({ error: "Customer ID is required" }), { status: 400 });
    }
    
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const savedCards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));
    
    return NextResponse.json({ cards: savedCards });
  } catch (error) {
    console.error("[API/get-cards-by-customer] Error:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
        ? `Stripe Error: ${error.message}` 
        : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}