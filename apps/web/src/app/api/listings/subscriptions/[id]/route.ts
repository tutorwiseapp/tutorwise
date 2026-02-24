/**
 * Filename: api/listings/subscriptions/[id]/route.ts
 * Purpose: Get, update, or delete a specific subscription
 * Created: 2026-02-24
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/listings/subscriptions/[id]
 * Get detailed information about a specific subscription
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: subscriptionId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch subscription using RPC function
    const { data: subscriptionDetails, error: rpcError } = await supabase
      .rpc('get_subscription_details', { p_subscription_id: subscriptionId });

    if (rpcError) {
      console.error('[Get Subscription] RPC error:', rpcError);
      throw rpcError;
    }

    if (!subscriptionDetails || subscriptionDetails.length === 0) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const details = subscriptionDetails[0];

    // 3. Verify authorization
    const isClient = user.id === details.client_id;
    const isTutorOrAgent = user.id === details.tutor_id;

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.roles?.includes('admin');

    if (!isClient && !isTutorOrAgent && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to view this subscription' },
        { status: 403 }
      );
    }

    return NextResponse.json({ subscription: details });

  } catch (error) {
    console.error('[Get Subscription] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/listings/subscriptions/[id]
 * Update subscription details (e.g., Stripe IDs after checkout)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: subscriptionId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const allowedFields = ['stripe_subscription_id', 'stripe_customer_id', 'status'];

    // Filter to only allowed fields
    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // 3. Fetch subscription to verify ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('listing_subscriptions')
      .select('client_id, listing:listings!listing_id(profile_id)')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // 4. Verify authorization (client or listing owner)
    const isClient = user.id === subscription.client_id;
    const isTutorOrAgent = user.id === (subscription.listing as any)?.profile_id;

    if (!isClient && !isTutorOrAgent) {
      return NextResponse.json(
        { error: 'You are not authorized to update this subscription' },
        { status: 403 }
      );
    }

    // 5. Update subscription
    updateData.updated_at = new Date().toISOString();

    const { data: updatedSubscription, error: updateError } = await supabase
      .from('listing_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      console.error('[Update Subscription] Error:', updateError);
      throw updateError;
    }

    console.log('[Update Subscription] Subscription updated:', {
      subscriptionId,
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription
    });

  } catch (error) {
    console.error('[Update Subscription] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
