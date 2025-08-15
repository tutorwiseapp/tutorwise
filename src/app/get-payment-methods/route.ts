/*
 * Filename: src/app/api/stripe/get-payment-methods/route.ts
 * Purpose: Provides a secure, server-side API to fetch a user's saved payment methods.
 * Change History:
 * C001 - 2025-08-09 : 10:00 - Initial creation.
 * Last Modified: 2025-08-09 : 10:00
 * Requirement ID: VIN-PAY-2
 * Change Summary: This new API route was created to fulfill the first step of the Payments v2.0 epic. It securely authenticates the user, retrieves their Stripe Customer ID from Clerk metadata, and uses the Stripe SDK to list their saved payment methods.
 * Impact Analysis: This is an additive, foundational change for the "Manage Sending Payment Methods" feature. It has no impact on existing functionality.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET() {
  try {
    // 1. Authenticate the user and get their ID
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 2. Retrieve the user's Stripe Customer ID from their Clerk metadata
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
      // It's not an error if the user has no Stripe customer ID yet.
      // It just means they have no saved cards. Return an empty array.
      return NextResponse.json([]);
    }

    // 3. Use the Stripe SDK to list the payment methods for that customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    // 4. Format the data to send back only what the client needs
    const savedCards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));

    return NextResponse.json(savedCards);

  } catch (error) {
    console.error("Error fetching payment methods:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError
        ? error.message
        : "An unknown error occurred.";
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}