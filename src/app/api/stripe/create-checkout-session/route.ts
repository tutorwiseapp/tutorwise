// src/app/api/stripe/create-checkout-session/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Create a Stripe Customer for the user if one doesn't exist
  // and store the customer ID in your database.
  // const customerId = "cus_...";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'setup', // Use 'setup' mode to save a card for future use
    // customer: customerId,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payments?status=cancelled`,
  });

  return NextResponse.json({ sessionId: session.id });
}