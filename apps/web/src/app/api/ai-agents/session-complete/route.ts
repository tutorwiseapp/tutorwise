/**
 * Filename: api/ai-agents/session-complete/route.ts
 * Purpose: Handles Stripe success redirect — verifies payment, creates AI session, redirects
 * Created: 2026-03-03
 *
 * Flow (called by Stripe success_url):
 * 1. Verify Stripe checkout session is paid
 * 2. Create ai_agent_sessions record
 * 3. Redirect to /ai-agents/[agent_id]/session/[sessionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const checkoutId = searchParams.get('checkout_id');
  const origin = new URL(req.url).origin;

  if (!checkoutId) {
    return NextResponse.redirect(`${origin}/marketplace?error=missing_checkout`);
  }

  try {
    // 1. Retrieve Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutId);

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.redirect(`${origin}/marketplace?error=payment_not_completed`);
    }

    const { agent_id, user_id, price_per_hour, owner_id } = checkoutSession.metadata || {};

    if (!agent_id || !user_id) {
      return NextResponse.redirect(`${origin}/marketplace?error=invalid_metadata`);
    }

    const supabase = await createClient();

    // 2. Idempotency check — don't create duplicate sessions for same checkout
    const { data: existing } = await supabase
      .from('ai_agent_sessions')
      .select('id, agent_id')
      .eq('stripe_checkout_id', checkoutId)
      .maybeSingle();

    if (existing) {
      // Already created — redirect to existing session
      return NextResponse.redirect(`${origin}/ai-agents/${existing.agent_id}/session/${existing.id}`);
    }

    // 3. Fetch agent to confirm still published
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('id, price_per_hour')
      .eq('id', agent_id)
      .single();

    if (!agent) {
      return NextResponse.redirect(`${origin}/marketplace?error=agent_not_found`);
    }

    const price = parseFloat(price_per_hour || '0') || agent.price_per_hour;

    // 4. Create AI session record
    const { data: session, error: sessionError } = await supabase
      .from('ai_agent_sessions')
      .insert({
        agent_id,
        client_id: user_id,
        price_paid: price,
        platform_fee: price * 0.1,
        owner_earnings: price * 0.9,
        status: 'active',
        stripe_checkout_id: checkoutId,
      })
      .select('id, agent_id')
      .single();

    if (sessionError || !session) {
      console.error('Failed to create AI session after payment:', sessionError);
      return NextResponse.redirect(`${origin}/marketplace?error=session_creation_failed`);
    }

    // 5. Redirect to session page
    return NextResponse.redirect(`${origin}/ai-agents/${session.agent_id}/session/${session.id}`);
  } catch (error) {
    console.error('session-complete error:', error);
    return NextResponse.redirect(`${origin}/marketplace?error=unexpected`);
  }
}
