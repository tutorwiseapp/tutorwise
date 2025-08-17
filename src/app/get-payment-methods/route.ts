/*
 * Filename: src/app/api/stripe/get-payment-methods/route.ts
 * Purpose: Provides a secure, server-side API to fetch a user's saved payment methods.
 * Change History:
 * C003 - 2025-08-10 : 04:00 - Definitive fix for async/await error.
 * C002 - 2025-08-10 : 03:00 - Now also returns the default payment method ID.
 * C001 - 2025-08-09 : 10:00 - Initial creation.
 * Last Modified: 2025-08-10 : 04:00
 * Requirement ID: VIN-PAY-2
 * Change Summary: This is the definitive fix for the TypeScript build error. Added the required `await` keyword before `clerkClient()` to correctly resolve the promise and get the client instance.
 * Impact Analysis: This change fixes a critical build-blocking error.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
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

    // --- THIS IS THE DEFINITIVE FIX ---
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
      return NextResponse.json({ cards: [], defaultPaymentMethodId: null });
    }
    
    const [customer, paymentMethods] = await Promise.all([
        stripe.customers.retrieve(stripeCustomerId),
        stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card' })
    ]);

    const savedCards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));

    return NextResponse.json({ 
        cards: savedCards, 
        defaultPaymentMethodId: (customer as Stripe.Customer).invoice_settings?.default_payment_method 
    });

  } catch (error) {
    console.error("Error fetching payment methods:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}