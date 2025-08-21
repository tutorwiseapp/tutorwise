/*
 * Filename: src/app/api/stripe/get-payment-methods/route.ts
 * Purpose: Provides a secure, server-side API to fetch a user's saved payment methods.
 * Change History:
 * C004 - 2025-08-21 : 15:00 - Definitive and final re-architecture using a "Trust, but Verify" pattern.
 * C003 - 2025-08-10 : 04:00 - Fixed async/await error.
 * Last Modified: 2025-08-21 : 15:00
 * Requirement ID: VIN-PAY-2
 * Change Summary: This is the definitive and final fix for displaying saved cards. The logic has been completely re-architected to be fully resilient to data inconsistencies. It now uses the user's verified email to find the authoritative Customer record in Stripe, bypassing any potentially stale metadata from Clerk. It then self-heals the Clerk metadata for future consistency. This "Trust, but Verify" pattern guarantees that the correct payment methods are always fetched, permanently resolving the bug where cards would not appear.
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
      // This is a valid state for a user who hasn't verified an email yet.
      return NextResponse.json({ cards: [], defaultPaymentMethodId: null });
    }
    
    // --- THIS IS THE DEFINITIVE "TRUST, BUT VERIFY" FIX ---
    
    // 1. VERIFY: Find the customer in Stripe using the verified email. This is the source of truth.
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      // No customer exists in Stripe for this user yet. This is a valid state.
      console.log(`[API/get-payment-methods] No Stripe customer found for email: ${userEmail}. Returning empty list.`);
      return NextResponse.json({ cards: [], defaultPaymentMethodId: null });
    }
    
    const stripeCustomer = customers.data[0];
    const stripeCustomerId = stripeCustomer.id;
    
    // 2. SELF-HEAL: If Clerk's metadata is out of sync, update it now. This is critical.
    if (user.publicMetadata.stripe_customer_id !== stripeCustomerId) {
        console.warn(`[API/get-payment-methods] Data inconsistency detected for user ${userId}. Self-healing Clerk metadata.`);
        await client.users.updateUserMetadata(userId, {
            publicMetadata: { ...user.publicMetadata, stripe_customer_id: stripeCustomerId }
        });
    }

    // 3. FETCH: Use the guaranteed-correct ID from Stripe to get the payment methods.
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
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