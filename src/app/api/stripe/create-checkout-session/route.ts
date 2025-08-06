/*
 * Filename: src/api/stripe/create-checkout-session/route.ts
 * Purpose: Creates a Stripe Checkout Session for saving a new payment method.
 * Change History:
 * C001 - 2025-07-27 : 16:30 - Initial creation.
 * Last Modified: 2025-07-27 : 16:30
 * Requirement ID: VIN-API-003
 * Change Summary: This file was created to provide the backend logic for the "Add New Card"
 * button. It securely authenticates the user, finds their Stripe Customer ID from their Clerk
 * publicMetadata, and creates a Stripe Checkout Session in 'setup' mode.
 * Impact Analysis: This is an additive change that makes the "Add New Card" feature on the
 * payments page functional. It depends on the webhook correctly creating a Stripe Customer ID.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
      // This should not happen if the webhook is working, but it's a critical safeguard.
      return new NextResponse("Stripe customer not found for this user", { status: 404 });
    }

    // Create a Stripe Checkout Session in "setup" mode.
    // This mode is specifically for saving a payment method for future use.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}