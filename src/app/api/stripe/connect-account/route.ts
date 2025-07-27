/*
 * Filename: src/app/api/stripe/connect-account/route.ts
 * Purpose: Creates a Stripe Express Account and an Account Link for user onboarding.
 * Change History:
 * C006 - 2025-07-27 : 23:45 - Added robust validation for user and email.
 * ... (previous history)
 * Last Modified: 2025-07-27 : 23:45
 * Requirement ID: VIN-API-002
 * Change Summary: This is the definitive fix for the Stripe 400 Bad Request error. Added
 * explicit checks to ensure that a user object and a primary email address exist before
 * attempting to call the Stripe API. This prevents sending invalid data and makes the
 * account creation process more robust.
 * Impact Analysis: This change resolves the final runtime error in the Stripe Connect flow,
 * making the "Connect with Stripe" button fully functional and reliable.
 * Dependencies: "next/server", "@clerk/nextjs/server", "@/lib/stripe".
 */
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // --- THIS IS THE FIX (PART 1) ---
    // 1. Validate that the user object was successfully fetched.
    if (!user) {
        return new NextResponse("User not found", { status: 404 });
    }
    
    // Find the user's primary email address object from the array.
    const primaryEmailObject = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    );
    
    // Extract the email string from the object.
    const primaryEmail = primaryEmailObject?.emailAddress;

    // --- THIS IS THE FIX (PART 2) ---
    // 2. Validate that a primary email address was actually found.
    if (!primaryEmail) {
        // If not, return a clear error instead of calling Stripe with invalid data.
        return new NextResponse("User has no primary email address.", { status: 400 });
    }

    let stripeAccountId = user.publicMetadata?.stripe_account_id as string | undefined;

    if (!stripeAccountId) {
      // Now this call is safe because we know `primaryEmail` is a valid string.
      const account = await stripe.accounts.create({
        type: 'express',
        email: primaryEmail,
        capabilities: {
          card_payments: { requested: true },
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
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error) {
    console.error("Error creating Stripe connect link:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}