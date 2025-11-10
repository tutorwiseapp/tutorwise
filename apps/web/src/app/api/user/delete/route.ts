// Filename: src/app/api/user/delete/route.ts

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST() {
  try {
    // 1. Authenticate the user securely from their session cookie.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User not found.' }, { status: 401 });
    }

    // 2. Initialize the Admin client to fetch user profile and perform deletion.
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Fetch the user's Vinite profile to get Stripe IDs
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('stripe_customer_id, stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'Failed to retrieve user profile data.' 
      }, { status: 500 });
    }

    // 4. Delete Stripe Connect Account (if exists)
    if (profile?.stripe_account_id) {
      try {
        console.log(`Deleting Stripe Connect account: ${profile.stripe_account_id}`);
        await stripe.accounts.del(profile.stripe_account_id);
        console.log('Stripe Connect account deleted successfully');
      } catch (stripeError: any) {
        console.error('Stripe Connect account deletion error:', stripeError.message);
        // Continue with deletion even if Stripe account deletion fails
        // This handles cases where the account might already be deleted or invalid
        if (stripeError.code !== 'resource_missing') {
          return NextResponse.json({ 
            error: `Failed to delete Stripe payout account: ${stripeError.message}` 
          }, { status: 500 });
        }
      }
    }

    // 5. Delete Stripe Customer (if exists)
    if (profile?.stripe_customer_id) {
      try {
        console.log(`Deleting Stripe customer: ${profile.stripe_customer_id}`);
        await stripe.customers.del(profile.stripe_customer_id);
        console.log('Stripe customer deleted successfully');
      } catch (stripeError: any) {
        console.error('Stripe customer deletion error:', stripeError.message);
        // Continue with deletion even if Stripe customer deletion fails
        // This handles cases where the customer might already be deleted or invalid
        if (stripeError.code !== 'resource_missing') {
          return NextResponse.json({ 
            error: `Failed to delete Stripe customer account: ${stripeError.message}` 
          }, { status: 500 });
        }
      }
    }

    // 6. Perform the user deletion from Supabase (this will cascade to delete the profile)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      // If Supabase returns an error, forward it in a proper JSON response.
      console.error('Supabase user deletion error:', deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(`Successfully deleted user account: ${user.id}`);

    // 7. On success, return a clear JSON response.
    return NextResponse.json({ 
      success: true,
      message: 'Account and all associated data deleted successfully.'
    });

  } catch (e) {
    // 8. Catch any other unexpected errors and return a proper JSON response.
    const error = e as Error;
    console.error('Unhandled error in delete route:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'An unexpected server error occurred during account deletion.' 
    }, { status: 500 });
  }
}