/**
 * Filename: api/ai-tutors/[id]/subscription/route.ts
 * Purpose: AI Tutor Subscription API - Manage £10/month subscriptions
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - POST /api/ai-tutors/[id]/subscription - Create subscription checkout
 * - GET /api/ai-tutors/[id]/subscription - Get subscription details
 * - DELETE /api/ai-tutors/[id]/subscription - Cancel subscription
 * - PATCH /api/ai-tutors/[id]/subscription - Reactivate subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  createSubscriptionCheckout,
  getAITutorSubscription,
  cancelSubscription,
  reactivateSubscription,
} from '@/lib/ai-tutors/subscription-manager';

/**
 * POST /api/ai-tutors/[id]/subscription
 * Create Stripe Checkout Session for AI tutor subscription
 *
 * Returns: { url: string } - Redirect URL to Stripe Checkout
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Checkout Session
    const session = await createSubscriptionCheckout(id, user.id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('Error creating subscription checkout:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('already has an active subscription')) {
      return NextResponse.json({ error: errorMessage }, { status: 409 });
    }

    if (errorMessage.includes('not configured')) {
      return NextResponse.json(
        { error: 'Subscription service not configured. Contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to create subscription checkout' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-tutors/[id]/subscription
 * Get subscription details
 *
 * Returns: Subscription object or null
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: tutor } = await supabase
      .from('ai_tutors')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (!tutor || tutor.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get subscription
    const subscription = await getAITutorSubscription(id);

    return NextResponse.json({ subscription }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subscription:', error);

    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-tutors/[id]/subscription
 * Cancel subscription at period end
 *
 * User keeps access until current billing period ends
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cancel subscription
    await cancelSubscription(id, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error canceling subscription:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('No active subscription')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai-tutors/[id]/subscription
 * Reactivate a canceled subscription
 *
 * Only works if subscription hasn't ended yet
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reactivate subscription
    await reactivateSubscription(id, user.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error reactivating subscription:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Not authorized')) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes('No subscription found')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes('not scheduled for cancellation')) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
