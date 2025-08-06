/*
 * Filename: src/app/api/stripe/create-charge-and-transfer/route.ts
 * Purpose: Implements the 'Separate Charges and Transfers' flow for a transaction.
 * Change History:
 * C001 - 2025-07-28 : 00:30 - Initial creation.
 * Last Modified: 2025-07-28 : 00:30
 * Requirement ID: VIN-API-007
 * Change Summary: This file was created to handle the core transaction logic. It uses the
 * modern PaymentIntents API to charge a customer, collect an application fee for the
 * Vinite platform, and transfer the remaining funds to a connected account (a Provider).
 * This is the definitive server-side implementation of the flow shown in the documentation diagram.
 * Impact Analysis: This is an additive change that provides the essential backend functionality
 * for processing payments between users on the Vinite platform.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

// This is the main function that will handle the POST request
export async function POST(req: Request) {
  try {
    // 1. Authenticate the user making the payment (the Seeker)
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 2. Parse the request body to get transaction details
    const {
      amount, // The total amount to charge the customer, in the smallest currency unit (e.g., cents)
      currency, // e.g., 'gbp', 'usd'
      destinationAccountId, // The Stripe Connect account ID of the Provider to pay
      paymentMethodId // The ID of the Seeker's saved payment method
    } = await req.json();

    // Basic validation
    if (!amount || !currency || !destinationAccountId || !paymentMethodId) {
        return new NextResponse(JSON.stringify({ error: "Missing required transaction details." }), { status: 400 });
    }

    // 3. Retrieve the Seeker's Stripe Customer ID from their Clerk metadata
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeCustomerId = user.publicMetadata?.stripe_customer_id as string | undefined;

    if (!stripeCustomerId) {
        return new NextResponse(JSON.stringify({ error: "User does not have a saved payment method." }), { status: 400 });
    }

    // 4. Calculate the Application Fee (Vinite's commission)
    // Example: A 12.3% fee. For a 1000 cent ($10.00) charge, the fee is 123 cents ($1.23).
    const applicationFee = Math.floor(amount * 0.123);

    // 5. Create the PaymentIntent
    // This single API call performs the entire flow from the diagram:
    // It charges the customer, takes a fee, and designates the rest for the provider.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      off_session: true, // Indicates the charge is happening without direct user interaction at this moment
      confirm: true, // Attempt to capture the payment immediately
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: destinationAccountId, // Transfer the remainder to the Provider
      },
    });
    
    // 6. Return a success response
    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });

  } catch (error) {
    // Handle potential errors, such as a declined card
    const errorMessage = error instanceof Stripe.errors.StripeError
        ? error.message
        : "An unknown error occurred.";
    
    console.error("Error creating charge and transfer:", error);
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}