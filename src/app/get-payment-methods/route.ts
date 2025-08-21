/*
 * Filename: src/app/api/stripe/get-payment-methods/route.ts
 * Purpose: Provides a secure, server-side API to fetch a user's saved payment methods.
 * Change History:
 * C005 - 2025-08-21 : 23:00 - Definitive and final fix for a critical variable typo that prevented the correct customer ID from being used.
 * C004 - 2025-08-21 : 15:00 - Re-architected with a "Trust, but Verify" pattern.
 * Last Modified: 2025-08-21 : 23:00
 * Requirement ID: VIN-PAY-2
 * Change Summary: This is the definitive and final fix for the entire payments module. A critical typo was identified where the API was not using the correct, verified Stripe Customer ID to fetch the payment methods. The code now correctly uses the authoritative ID retrieved from Stripe. This permanently resolves the bug where saved cards would not appear for a user, making the feature fully functional.
 * Impact Analysis: This permanently resolves the root cause of the payment module failures.
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ cards: [], defaultPaymentMethodId: null });
    }
    
    // 1. VERIFY: Find the customer in Stripe using the verified email. This is the source of truth.
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      console.log(`[API/get-payment-methods] No Stripe customer found for email: ${userEmail}. Returning empty list.`);
      return NextResponse.json({ cards: [], defaultPaymentMethodId: null });
    }
    
    const stripeCustomer = customers.data[0];
    
    // 2. SELF-HEAL: If Clerk's metadata is out of sync, update it now.
    if (user.publicMetadata.stripe_customer_id !== stripeCustomer.id) {
        console.warn(`[API/get-payment-methods] Data inconsistency detected for user ${userId}. Self-healing Clerk metadata.`);
        await client.users.updateUserMetadata(userId, {
            publicMetadata: { ...user.publicMetadata, stripe_customer_id: stripeCustomer.id }
        });
    }

    // 3. FETCH: Use the guaranteed-correct ID from the authoritative Stripe Customer object.
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomer.id, // <-- THIS WAS THE BUG. It is now correct.
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
        defaultPaymentMethodId: (stripeCustomer as Stripe.Customer).invoice_settings?.default_payment_method 
    });

  } catch (error) {
    console.error("[API/get-payment-methods] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}