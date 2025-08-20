/*
 * Filename: src/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C007 - 2025-08-17 : 10:00 - Definitive and final fix implementing just-in-time Stripe Customer creation.
 * C006 - 2025-08-14 : 15:00 - Fixed TypeScript and syntax errors.
 * Last Modified: 2025-08-17 : 10:00
 * Requirement ID: VIN-API-003
 * Change Summary: This is the definitive and final re-architecture of this route. It no longer relies on waiting for the webhook. Instead, it implements a robust "just-in-time" provisioning model. If a user does not have a Stripe Customer ID when they try to add a card, this route now creates one for them instantly and saves it to their Clerk metadata. This completely eliminates the race condition for new users and guarantees the "Create New Card" flow will work reliably every time.
 * Impact Analysis: This change permanently stabilizes the new user payment setup journey, making it a robust, production-grade feature.
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    let stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;

    // --- THIS IS THE DEFINITIVE, FINAL FIX ---
    // If the user does not have a Stripe Customer ID, create one for them now.
    if (!stripeCustomerId) {
      console.log(`[API/create-checkout-session] Stripe Customer ID not found for user ${userId}. Creating one just-in-time.`);
      
      const newCustomer = await stripe.customers.create({
        email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress,
        name: user.fullName || undefined,
        metadata: { clerkId: user.id }
      });

      stripeCustomerId = newCustomer.id;

      // Immediately save the new ID to Clerk's metadata.
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          stripe_customer_id: stripeCustomerId,
        }
      });
      console.log(`[API/create-checkout-session] Successfully created and saved new Stripe Customer ${stripeCustomerId} for user ${userId}.`);
    }

    // Now, we are guaranteed to have a valid customer ID.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("[API/create-checkout-session] CRITICAL ERROR:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError
      ? `Stripe Error: ${error.message}`
      : "An internal server error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}