/*
 * Filename: src/app/api/stripe/disconnect-account/route.ts
 * Purpose: Securely deletes a user's Stripe Connect account.
 * Change History:
 * C001 - 2025-08-10 : 00:00 - Initial creation.
 * Last Modified: 2025-08-10 : 00:00
 * Requirement ID: VIN-PAY-1
 * Change Summary: This API route provides the secure, server-side logic to delete a user's Stripe Connect account and remove the corresponding ID from their Clerk metadata. This is a critical security and user management feature.
 * Impact Analysis: This is an additive change that makes the "Disconnect Stripe" feature functional.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const stripeAccountId = user.publicMetadata?.stripe_account_id as string | undefined;

    if (!stripeAccountId) {
      return new NextResponse(JSON.stringify({ error: "No Stripe account connected to this user." }), { status: 400 });
    }

    // 1. Delete the account from Stripe
    await stripe.accounts.del(stripeAccountId);

    // 2. Remove the ID from the user's Clerk metadata
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        stripe_account_id: null, // Set to null to clear it
      }
    });

    return NextResponse.json({ success: true, message: 'Stripe account disconnected successfully.' });

  } catch (error) {
    console.error("Error disconnecting Stripe account:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError
        ? error.message
        : "An unknown error occurred.";
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}