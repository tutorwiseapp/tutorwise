/*
 * Filename: src/app/api/stripe/verify-and-get-cards/route.ts
 * Purpose: Provides a secure, targeted endpoint to verify ownership and fetch payment methods for a specific Stripe Customer ID.
 * Change History:
 * C002 - 2025-08-21 : 20:00 - Definitive fix for TypeScript error by handling the 'DeletedCustomer' case.
 * C001 - 2025-08-21 : 18:00 - Initial creation.
 * Last Modified: 2025-08-21 : 20:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the build-blocking TypeScript error. The code now includes a crucial check to verify that the customer retrieved from Stripe has not been deleted. This handles the edge case where the API could return a `DeletedCustomer` object (which lacks a `metadata` property), making the code type-safe and more resilient.
 * Impact Analysis: This change fixes a critical compilation error and makes the verification flow robust against edge cases.
 */
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

    // --- THIS IS THE DEFINITIVE FIX ---
    // First, check if the retrieved customer object has been deleted.
    if (customer.deleted) {
        console.warn(`[SECURITY] User ${userId} attempted to access a deleted Stripe customer ${customerId}.`);
        return new NextResponse(JSON.stringify({ error: "Customer not found." }), { status: 404 });
    }
    
    // --- SECURITY CHECK: Verify Ownership ---
    // Now that we know it's not a DeletedCustomer, we can safely access metadata.
    if (customer.metadata.clerkId !== userId) {
        console.warn(`[SECURITY] User ${userId} attempted to access Stripe customer ${customerId} owned by ${customer.metadata.clerkId}.`);
        return new NextResponse(JSON.stringify({ error: "Permission Denied" }), { status: 403 });
    }

    // --- FETCH DATA ---
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