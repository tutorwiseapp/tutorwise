/*
 * Filename: src/app/api/stripe/connect-account/route.ts
 * Purpose: Creates a Stripe Express Account for a user.
 * Change History:
 * C012 - 2025-09-03 : 14:15 - Updated to use NEXT_PUBLIC_SITE_URL for robust deployment URLs.
 * C011 - 2025-09-02 : 19:00 - Migrated to use Supabase server client for authentication.
 * Last Modified: 2025-09-03 : 14:15
 * Requirement ID: VIN-AUTH-MIG-05
 */
 import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new NextResponse(
        JSON.stringify({ error: "Authentication required" }), 
        { status: 401 }
      );
    }
    
    if (!user.email) {
        console.error('User has no email address:', user.id);
        return new NextResponse(
          JSON.stringify({ error: "User email is required for Stripe account creation" }), 
          { status: 400 }
        );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new NextResponse(
        JSON.stringify({ error: "Could not retrieve user profile" }), 
        { status: 500 }
      );
    }

    let stripeAccountId = profile?.stripe_account_id;

    if (!stripeAccountId) {
      console.log('Creating new Stripe account for user:', user.id);
      
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          email: user.email,
          capabilities: { 
            transfers: { requested: true },
            card_payments: { requested: true }
          },
          business_type: 'individual',
          metadata: {
            supabaseUserId: user.id
          }
        });
        
        stripeAccountId = account.id;
        console.log('Created Stripe account:', stripeAccountId);

        await supabase
          .from('profiles')
          .update({ stripe_account_id: stripeAccountId })
          .eq('id', user.id);
        
      } catch (stripeError) {
        console.error('Stripe account creation error:', stripeError);
        return new NextResponse(
          JSON.stringify({ 
            error: stripeError instanceof Stripe.errors.StripeError 
              ? stripeError.message 
              : "Failed to create Stripe account" 
          }), 
          { status: 500 }
        );
      }
    }

    console.log('Creating account link for:', stripeAccountId);
    
    try {
      // --- THIS IS THE DEFINITIVE FIX ---
      // Get the origin URL directly from the request object for reliability.
      const origin = new URL(req.url).origin;

      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/payments?refresh=true`,
        return_url: `${origin}/payments?connected=true`,
        type: 'account_onboarding',
      });

      console.log('Account link created successfully:', accountLink.url);
      
      return NextResponse.json({ 
        url: accountLink.url,
        accountId: stripeAccountId 
      });
      
    } catch (linkError) {
      console.error('Account link creation error:', linkError);
      return new NextResponse(
        JSON.stringify({ 
          error: linkError instanceof Stripe.errors.StripeError 
            ? linkError.message 
            : "Failed to create onboarding link" 
        }), 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected error in connect-account:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: "An unexpected server error occurred" 
      }), 
      { status: 500 }
    );
  }
}

