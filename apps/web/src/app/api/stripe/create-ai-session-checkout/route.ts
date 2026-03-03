/**
 * Filename: api/stripe/create-ai-session-checkout/route.ts
 * Purpose: Creates a Stripe Checkout Session for an AI tutor session (per-session payment)
 * Created: 2026-03-03
 *
 * Flow:
 * 1. Validate agent is published
 * 2. Find/create Stripe customer for user
 * 3. Create Stripe checkout with agent metadata
 * 4. success_url → /api/ai-agents/session-complete?checkout_id={CHECKOUT_SESSION_ID}
 * 5. session-complete creates the ai_agent_sessions record after payment confirmed
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'payment:checkout_create');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimitResult),
        { status: 429, headers: rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetAt) }
      );
    }

    // 3. Parse body
    const { agent_id, agent_name } = await req.json();
    if (!agent_id || !agent_name) {
      return NextResponse.json({ error: 'agent_id and agent_name are required' }, { status: 400 });
    }

    // 4. Fetch agent with owner stripe account (for transfer_data)
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select(`
        id, display_name, price_per_hour, status, is_platform_owned, owner_id,
        owner:profiles!ai_agents_owner_id_fkey(stripe_account_id)
      `)
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'AI tutor not found' }, { status: 404 });
    }

    if (agent.status !== 'published') {
      return NextResponse.json({ error: 'AI tutor is not available' }, { status: 403 });
    }

    // Prevent creator booking their own agent
    if (agent.owner_id === user.id) {
      return NextResponse.json({ error: 'You cannot start a session with your own AI tutor' }, { status: 403 });
    }

    // 5. Find or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('User profile not found');

    let stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        name: profile.full_name,
        metadata: { supabaseId: user.id },
      });
      stripeCustomerId = newCustomer.id;
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // 6. Build success/cancel URLs
    const origin = new URL(req.url).origin;
    const successUrl = `${origin}/api/ai-agents/session-complete?checkout_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/marketplace/ai-agents/${agent_name}?payment=cancelled`;

    // 7. Determine transfer data (third-party agent owners get 90%)
    const ownerStripeAccountId = !agent.is_platform_owned
      ? (agent.owner as any)?.stripe_account_id
      : null;

    const paymentIntentData: Stripe.Checkout.SessionCreateParams['payment_intent_data'] =
      ownerStripeAccountId
        ? {
            application_fee_amount: Math.round(agent.price_per_hour * 100 * 0.1), // 10% platform fee
            transfer_data: { destination: ownerStripeAccountId },
          }
        : undefined;

    // 8. Create Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${agent.display_name} — AI Tutor Session`,
              description: `1-hour session with ${agent.display_name} on Tutorwise`,
            },
            unit_amount: Math.round(agent.price_per_hour * 100), // pence
          },
          quantity: 1,
        },
      ],
      metadata: {
        agent_id: agent.id,
        agent_name,
        user_id: user.id,
        price_per_hour: String(agent.price_per_hour),
        is_platform_owned: String(agent.is_platform_owned),
        owner_id: agent.owner_id || '',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: paymentIntentData,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Stripe.errors.StripeError
      ? `Stripe Error: ${error.message}`
      : 'An internal server error occurred.';
    console.error('Error creating AI session checkout:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
