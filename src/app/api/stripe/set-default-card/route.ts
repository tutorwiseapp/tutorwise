/*
 * Filename: src/app/api/stripe/set-default-card/route.ts
 * Purpose: Securely sets a user's default payment method in Stripe.
 * Change History:
 * C002 - 2025-08-10 : 04:00 - Definitive fix for async/await error.
 * C001 - 2025-08-10 : 03:00 - Initial creation.
 * Last Modified: 2025-08-10 : 04:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This is the definitive fix for the TypeScript build error. Added the required `await` keyword before `clerkClient()` to correctly resolve the promise and get the client instance.
 * Impact Analysis: This change fixes a critical build-blocking error.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) return new NextResponse(JSON.stringify({ error: "Payment Method ID is required" }), { status: 400 });

    // --- THIS IS THE DEFINITIVE FIX ---
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;
    if (!stripeCustomerId) return new NextResponse(JSON.stringify({ error: "Stripe customer not found" }), { status: 404 });

    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error setting default payment method:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}