/*
 * Filename: src/app/api/stripe/verify-and-get-cards/route.ts
 * Purpose: Provides a secure, targeted endpoint to verify ownership and fetch payment methods for a specific Stripe Customer ID.
 * Change History:
 * C002 - 2025-08-22 : 23:00 - Restored and finalized as part of the definitive working architecture.
 * C001 - 2025-08-21 : 18:00 - Initial creation.
 * Last Modified: 2025-08-22 : 23:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This API route is the cornerstone of the definitive stateless verification flow. It receives a customer ID from the frontend, securely verifies that the logged-in user owns that customer record in Stripe by checking the metadata, and then returns the authoritative list of payment methods. This provides a secure and reliable way to bypass all data consistency and caching issues.
 * Impact Analysis: This is a critical component of the definitive fix for the payment card verification flow.
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
    
    if (customer.metadata.kindeId !== user.id) { // --- THIS IS THE FIX ---
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