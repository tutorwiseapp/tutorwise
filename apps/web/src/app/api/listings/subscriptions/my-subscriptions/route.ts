/**
 * Filename: api/listings/subscriptions/my-subscriptions/route.ts
 * Purpose: Fetch user's subscription listings (as client or tutor/agent)
 * Created: 2026-02-24
 *
 * Returns subscriptions based on user's active role:
 * - Client: Subscriptions they've purchased
 * - Tutor/Agent: Subscriptions to their listings
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/listings/subscriptions/my-subscriptions
 * Fetch user's subscriptions based on their active role
 *
 * Query params:
 * - status: filter by status (active, paused, cancelled, expired)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's profile for active role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, active_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // 4. Build query based on active role
    let query = supabase
      .from('listing_subscriptions')
      .select(`
        *,
        listing:listings!listing_id(
          id,
          title,
          slug,
          subscription_config,
          profile_id
        ),
        client:profiles!client_id(
          id,
          full_name,
          avatar_url,
          email
        )
      `);

    // Role-based filtering
    if (profile.active_role === 'client') {
      // Client sees their own subscriptions
      query = query.eq('client_id', user.id);
    } else if (profile.active_role === 'tutor' || profile.active_role === 'agent') {
      // Tutor/Agent sees subscriptions to their listings
      // Need to join through listings to filter by profile_id
      const { data: userListings } = await supabase
        .from('listings')
        .select('id')
        .eq('profile_id', user.id)
        .eq('listing_type', 'subscription');

      if (!userListings || userListings.length === 0) {
        // No subscription listings, return empty array
        return NextResponse.json({ subscriptions: [] });
      }

      const listingIds = userListings.map(l => l.id);
      query = query.in('listing_id', listingIds);
    } else {
      // Other roles don't have access to subscriptions
      return NextResponse.json({ subscriptions: [] });
    }

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // 5. Execute query
    const { data: subscriptions, error: subscriptionsError } = await query
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('[My Subscriptions API] Query error:', subscriptionsError);
      throw subscriptionsError;
    }

    // 6. Enrich with subscription details for each
    const enrichedSubscriptions = subscriptions?.map(sub => {
      const config = (sub.listing as any)?.subscription_config || {};
      return {
        ...sub,
        details: {
          frequency: config.frequency,
          session_duration_minutes: config.session_duration_minutes,
          price_per_month_pence: config.price_per_month_pence,
          term_time_only: config.term_time_only,
          session_limit_per_period: config.session_limit_per_period,
        }
      };
    });

    return NextResponse.json({
      subscriptions: enrichedSubscriptions || [],
      role: profile.active_role
    });

  } catch (error) {
    console.error('[My Subscriptions API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
