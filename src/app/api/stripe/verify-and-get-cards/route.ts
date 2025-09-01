/*
 * Filename: src/app/api/stripe/verify-and-get-cards/route.ts
 * Purpose: Provides a secure endpoint to verify ownership and fetch payment methods.
 * Change History:
 * C003 - 2025-09-01 : 18:00 - Definitive fix to verify against kindeId in Stripe metadata.
 * C002 - 2025-08-22 : 23:00 - Restored and finalized as part of the definitive working architecture.
 * C001 - 2025-08-21 : 18:00 - Initial creation.
 * Last Modified: 2025-09-01 : 18:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the security model in the payments flow. The security check now correctly verifies that the `kindeId` in the Stripe customer's metadata matches the authenticated Kinde user's ID. This resolves a critical bug that would cause a "Permission Denied" error.
 */
import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { getUser, isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const user = await getUser();
    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }

    const { customerId } = await req.json();
    if (!customerId) {
      return new NextResponse(JSON.stringify({ error: "Customer ID is required" }), { status: 400 });
    }
    
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
        return new NextResponse(JSON.stringify({ error: "Customer not found." }), { status: 404 });
    }
    
    // --- THIS IS THE DEFINITIVE FIX ---
    // We must verify against the 'kindeId' that we set when creating the customer.
    if (customer.metadata.kindeId !== user.id) {
        console.warn(`[SECURITY] User ${user.id} attempted to access Stripe customer ${customerId} owned by ${customer.metadata.kindeId}.`);
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