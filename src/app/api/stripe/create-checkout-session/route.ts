/*
 * Filename: src/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C003 - 2025-08-12 : 20:00 - Definitive fix with self-healing logic for stale Stripe Customer IDs.
 * C002 - 2025-08-12 : 19:00 - Added specific error handling for missing customer ID.
 * C001 - 2025-07-27 : 16:30 - Initial creation.
 * Last Modified: 2025-08-12 : 20:00
 * Requirement ID: VIN-API-003
 * Change Summary: This is the definitive fix for the "No such customer" error. The route now contains a robust catch block that specifically identifies this error from Stripe. When detected, it automatically creates a new Stripe Customer for the user, updates their Clerk metadata with the new, valid ID, and then retries creating the checkout session. This "self-healing" logic permanently resolves the data inconsistency without user intervention.
 * Impact Analysis: This makes the application resilient to data mismatches between Clerk and Stripe, fixing a critical failure point in the payment flow.
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

    if (!stripeCustomerId) {
      return new NextResponse(
        JSON.stringify({ error: "Stripe Customer ID not found. Webhook may have failed." }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("[API/create-checkout-session] Initial attempt failed:", error);

    // --- THIS IS THE DEFINITIVE SELF-HEALING FIX ---
    // Check if the error is specifically "No such customer"
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing' && error.param === 'customer') {
      console.warn(`[SELF-HEALING] Stale Stripe Customer ID detected for user. Re-creating customer.`);
      
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

        // Update Clerk metadata with the new, correct ID
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                ...user.publicMetadata,
                stripe_customer_id: newCustomer.id,
            }
        });

        console.log(`[SELF-HEALING] Successfully created new Stripe Customer ${newCustomer.id} for user ${userId}.`);

        // Retry creating the checkout session with the new customer ID
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'setup',
            customer: newCustomer.id, // Use the NEW customer ID
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
        });

        // If successful, return the new session. The user will be unaware a fix occurred.
        return NextResponse.json({ sessionId: session.id });

      } catch (retryError) {
        console.error("[SELF-HEALING] CRITICAL: Failed to recover from stale customer ID:", retryError);
        const errorMessage = retryError instanceof Error ? retryError.message : "Self-healing failed. Please contact support.";
        return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
      }
    }

    // For any other type of error, return a generic server error
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}