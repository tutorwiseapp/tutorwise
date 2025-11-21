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

    const userId = user.id;
    console.log(`[Delete Account] Starting deletion for user: ${userId}`);

    // 2. Initialize the Admin client to perform deletion.
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Fetch the user's profile to get Stripe IDs
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, stripe_account_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[Delete Account] Error fetching profile:', profileError);
      return NextResponse.json({ 
        error: 'Failed to retrieve user profile data.' 
      }, { status: 500 });
    }

    // 4. Delete Stripe Connect Account (if exists)
    if (profile?.stripe_account_id) {
      try {
        console.log(`[Delete Account] Deleting Stripe Connect account: ${profile.stripe_account_id}`);
        await stripe.accounts.del(profile.stripe_account_id);
        console.log('[Delete Account] Stripe Connect account deleted successfully');
      } catch (stripeError: any) {
        console.error('[Delete Account] Stripe Connect deletion error:', stripeError.message);
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
        console.log(`[Delete Account] Deleting Stripe customer: ${profile.stripe_customer_id}`);
        await stripe.customers.del(profile.stripe_customer_id);
        console.log('[Delete Account] Stripe customer deleted successfully');
      } catch (stripeError: any) {
        console.error('[Delete Account] Stripe customer deletion error:', stripeError.message);
        if (stripeError.code !== 'resource_missing') {
          return NextResponse.json({ 
            error: `Failed to delete Stripe customer account: ${stripeError.message}` 
          }, { status: 500 });
        }
      }
    }

    // 6. Delete user data from database (CASCADE will handle related tables)
    // Most tables have CASCADE DELETE on foreign keys, but we log the deletion process
    console.log('[Delete Account] Deleting user data from database...');
    
    // Tables that will CASCADE delete when auth user is deleted:
    // - profiles (CASCADE)
    // - profile_graph (CASCADE from profile_id references)
    // - connection_groups (CASCADE from profile_id)
    // - group_members (CASCADE from connection_id → profile_graph)
    // - chat_messages (CASCADE from sender_id/receiver_id)
    // - bookings (CASCADE from client_id/tutor_id)
    // - listings (CASCADE from profile_id)
    // - wiselists (CASCADE from profile_id)
    // - wiselist_items (CASCADE from wiselist_id)
    // - network_analytics (CASCADE from profile_id)
    // - referral_links (CASCADE from profile_id)
    // - referral_activities (CASCADE from referral_link_id)

    // 7. Perform the auth user deletion (this CASCADE deletes related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[Delete Account] Supabase user deletion error:', deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log(`[Delete Account] Successfully deleted user: ${userId}`);

    // 8. On success, return confirmation
    return NextResponse.json({ 
      success: true,
      message: 'Account and all associated data deleted successfully.'
    });

  } catch (e) {
    const error = e as Error;
    console.error('[Delete Account] Unhandled error:', error.message, error.stack);
    return NextResponse.json({ 
      error: 'An unexpected server error occurred during account deletion.' 
    }, { status: 500 });
  }
}
