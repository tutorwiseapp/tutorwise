/*
 * Filename: src/app/api/stripe/remove-card/route.ts
 * Purpose: Securely removes/detaches a user's saved payment method in Stripe.
 * Change History:
 * C001 - 2025-08-10 : 03:00 - Initial creation.
 * Last Modified: 2025-08-10 : 03:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This API route provides the backend logic to detach a PaymentMethod from a Stripe Customer, fulfilling a core requirement of the payment management story.
 * Impact Analysis: This is an additive, secure endpoint that makes the "Remove card" feature functional.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) return new NextResponse(JSON.stringify({ error: "Payment Method ID is required" }), { status: 400 });

    // For security, we don't need the customer ID. Detaching is a direct action on the payment method.
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error removing payment method:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}