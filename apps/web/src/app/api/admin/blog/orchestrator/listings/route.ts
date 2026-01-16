/*
 * Filename: src/app/api/admin/blog/orchestrator/listings/route.ts
 * Purpose: Fetch blog-assisted listings with visibility correlation signals
 * Created: 2026-01-16
 * Pattern: Admin-only API route calling Migration 182 RPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const attributionWindow = parseInt(searchParams.get('attributionWindow') || '7');

    // Validate parameters
    if (days < 1 || days > 365) {
      return NextResponse.json({ error: 'Days must be between 1 and 365' }, { status: 400 });
    }
    if (![7, 14, 30].includes(attributionWindow)) {
      return NextResponse.json({ error: 'Attribution window must be 7, 14, or 30 days' }, { status: 400 });
    }

    // Call RPC from Migration 182
    const { data: listingsData, error: listingsError } = await supabase
      .rpc('get_blog_assisted_listings', {
        p_days: days,
        p_attribution_window_days: attributionWindow
      });

    if (listingsError) {
      console.error('[Blog Orchestrator] Listings RPC Error:', listingsError);
      return NextResponse.json({ error: 'Failed to fetch listings data' }, { status: 500 });
    }

    return NextResponse.json({
      listings: listingsData || [],
    });
  } catch (error) {
    console.error('[Blog Orchestrator] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
