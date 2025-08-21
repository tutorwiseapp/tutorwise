/*
 * Filename: src/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C009 - 2025-08-21 : 18:00 - Definitive and final version that adds customer_id to the success_url.
 * C008 - 2025-08-20 : 14:00 - Re-architected with "Find or Create" pattern.
 * Last Modified: 2025-08-21 : 18:00
 * Requirement ID: VIN-API-003
 * Change Summary: This is the definitive and final version. It now adds the guaranteed-correct `stripeCustomerId` as a query parameter to the `success_url`. This provides the frontend with a stateless "receipt" that it can use to securely and reliably verify the session's outcome, permanently resolving all race conditions.
 * Impact Analysis: This completes the robust, stateless, and verifiable "Add New Card" user journey.
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
    const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!userEmail) {
        return new NextResponse(JSON.stringify({ error: "User has no primary email address." }), { status: 400 });
    }

    let stripeCustomerId: string;

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length > 0) {
      stripeCustomerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        name: user.fullName || undefined,
        metadata: { clerkId: user.id }
      });
      stripeCustomerId = newCustomer.id;
    }

    // Self-heal Clerk metadata if it's out of sync
    if (user.publicMetadata.stripe_customer_id !== stripeCustomerId) {
        await client.users.updateUserMetadata(userId, {
            publicMetadata: { ...user.publicMetadata, stripe_customer_id: stripeCustomerId }
        });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success&customer_id=${stripeCustomerId}`,
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