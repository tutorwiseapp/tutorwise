// src/app/api/stripe/connect-account/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe'; // We'll create this lib file next

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user already has a Stripe account ID in your DB
  // let { data: profile } = await supabase.from('profiles').select('stripe_account_id').single();
  // let stripeAccountId = profile.stripe_account_id;

  // For this example, we assume they don't have one yet.
  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // TODO: Save account.id to your user's profile in Supabase.
  
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}