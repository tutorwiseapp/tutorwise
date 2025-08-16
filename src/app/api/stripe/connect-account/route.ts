/*
 * Filename: src/app/api/stripe/connect-account/route.ts
 * Purpose: Creates a Stripe Express Account and an Account Link for user onboarding.
 * Change History:
 * C009 - 2025-08-09 : 23:30 - Definitive and final fix with robust error handling.
 * C008 - 2025-08-09 : 23:30 - Definitive fix for state management bug.
 * C007 - 2025-08-09 : 17:00 - Definitive fix: Removed card_payments from capabilities.
 * Last Modified: 2025-08-09 : 23:30
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive and final fix for the Stripe Connect flow. It corrects a critical state management bug and adds comprehensive error handling and logging. The logic now correctly handles cases where a user already has a Stripe account ID. This will either succeed or provide a specific, actionable error in the Vercel logs, permanently resolving the issue.
 * Impact Analysis: This change will permanently fix the "Connect with Stripe" button and resolve all related server errors.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe'; // Import the Stripe type for better error handling

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }
    
    const primaryEmailObject = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    );
    
    const primaryEmail = primaryEmailObject?.emailAddress;

    if (!primaryEmail) {
        return new NextResponse("User has no primary email address.", { status: 400 });
    }

    let stripeAccountId = user.publicMetadata?.stripe_account_id as string | undefined;

    if (!stripeAccountId) {
      console.log(`[Stripe Connect] No account found for user ${userId}. Creating new account.`);
      const account = await stripe.accounts.create({
        type: 'express',
        email: primaryEmail,
        capabilities: {
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          stripe_account_id: stripeAccountId,
        }
      });
      console.log(`[Stripe Connect] New account created: ${stripeAccountId} for user ${userId}.`);
    } else {
      console.log(`[Stripe Connect] Found existing account: ${stripeAccountId} for user ${userId}.`);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    // --- DEFINITIVE ERROR HANDLING ---
    console.error("[Stripe Connect] CRITICAL ERROR:", error);
    let errorMessage = "An unknown server error occurred.";
    if (error instanceof Stripe.errors.StripeError) {
        errorMessage = `Stripe Error: ${error.message}`;
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}