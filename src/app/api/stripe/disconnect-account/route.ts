import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/kinde';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const { getUser, isAuthenticated } = sessionManager();
    if (!(await isAuthenticated())) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const user = await getUser();
    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    const stripeAccountId = profile?.stripe_account_id;

    if (!stripeAccountId) {
      return new NextResponse(JSON.stringify({ error: "No Stripe account connected to this user." }), { status: 400 });
    }

    await stripe.accounts.del(stripeAccountId);

    await supabaseAdmin
      .from('profiles')
      .update({ stripe_account_id: null })
      .eq('id', user.id);

    return NextResponse.json({ success: true, message: 'Stripe account disconnected successfully.' });
  } catch (error) {
    console.error("Error disconnecting Stripe account:", error);
    const errorMessage = error instanceof Stripe.errors.StripeError
        ? error.message
        : "An unknown error occurred.";
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}