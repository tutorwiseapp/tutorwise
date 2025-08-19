/*
 * Filename: src/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C004 - 2025-08-14 : 10:00 - Added customer_id to the success_url to enable stateless polling.
 * C003 - 2025-08-12 : 20:00 - Implemented self-healing logic for stale Stripe Customer IDs.
 * Last Modified: 2025-08-14 : 10:00
 * Requirement ID: VIN-API-003
 * Change Summary: This is the final component of the definitive fix. The route now dynamically adds the verified `customer_id` as a query parameter to the `success_url`. This provides the frontend with the stateless information it needs to poll the correct customer record, permanently resolving the race condition.
 * Impact Analysis: This change completes the robust, verifiable "Add New Card" user journey.
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  let customerIdToUse: string | undefined;

  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    customerIdToUse = user.publicMetadata?.stripe_customer_id as string | undefined;

    if (!customerIdToUse) {
      return new NextResponse(
        JSON.stringify({ error: "Stripe Customer ID not found. Webhook may have failed." }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: customerIdToUse,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success&customer_id=${customerIdToUse}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("[API/create-checkout-session] Initial attempt failed:", error);

    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing' && error.param === 'customer') {
      console.warn(`[SELF-HEALING] Stale Stripe Customer ID detected. Re-creating customer.`);
      
      try {
        const { userId } = await auth();
        if (!userId) throw new Error("User became unauthenticated during retry.");

        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        const newCustomer = await stripe.customers.create({
            email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress,
            name: user.fullName || undefined,
            metadata: { clerkId: user.id }
        });

        await client.users.updateUserMetadata(userId, {
            publicMetadata: { ...user.publicMetadata, stripe_customer_id: newCustomer.id }
        });

        console.log(`[SELF-HEALING] Successfully created new Stripe Customer ${newCustomer.id} for user ${userId}.`);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'setup',
            customer: newCustomer.id,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success&customer_id=${newCustomer.id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
        });

        return NextResponse.json({ sessionId: session.id });

      } catch (retryError) {
        console.error("[SELF-HEALING] CRITICAL: Failed to recover from stale customer ID:", retryError);
        return new NextResponse(JSON.stringify({ error: "Self-healing failed. Please contact support." }), { status: 500 });
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}