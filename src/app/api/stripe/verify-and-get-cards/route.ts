/*
 * Filename: src/app/api/stripe/verify-and-get-cards/route.ts
 * Purpose: Provides a secure, targeted endpoint to verify ownership and fetch payment methods for a specific Stripe Customer ID.
 * Change History:
 * C002 - 2025-08-21 : 21:00 - Finalized documentation and confirmed robustness.
 * C001 - 2025-08-21 : 18:00 - Initial creation.
 * Last Modified: 2025-08-21 : 21:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive and final version. This API route is the cornerstone of the stateless verification flow. It securely verifies that the logged-in user owns the requested customer record and then returns the authoritative list of payment methods from Stripe. The code has been cleaned and fully documented.
 * Impact Analysis: This is a critical component of the definitive fix for the payment card verification flow.
 */
// ... (code is unchanged from the previous correct version, only the header is updated)
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { customerId } = await req.json();
    if (!customerId) {
      return new NextResponse(JSON.stringify({ error: "Customer ID is required" }), { status: 400 });
    }
    
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
        return new NextResponse(JSON.stringify({ error: "Customer not found." }), { status: 404 });
    }
    
    if (customer.metadata.clerkId !== userId) {
        console.warn(`[SECURITY] User ${userId} attempted to access Stripe customer ${customerId} owned by ${customer.metadata.clerkId}.`);
        return new NextResponse(JSON.stringify({ error: "Permission Denied" }), { status: 403 });
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
    
    return NextResponse.json({ 
        cards: savedCards,
        defaultPaymentMethodId: (customer as Stripe.Customer).invoice_settings?.default_payment_method 
    });

  } catch (error) {
    console.error("[API/verify-and-get-cards] Error:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError 
        ? `Stripe Error: ${error.message}` 
        : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}