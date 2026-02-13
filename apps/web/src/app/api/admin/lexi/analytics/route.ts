/**
 * Lexi Analytics API (Admin Only)
 *
 * GET /api/admin/lexi/analytics - Get Lexi usage analytics
 *
 * @module api/admin/lexi/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { conversationStore } from '@lexi/services/conversation-store';

/**
 * GET /api/admin/lexi/analytics
 * Get Lexi analytics data for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user and verify admin
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const days = parseInt(searchParams.get('days') || '7', 10);

    // Get analytics based on type
    if (type === 'summary') {
      const stats = await conversationStore.getSummaryStats();

      if (!stats) {
        return NextResponse.json(
          { error: 'Failed to fetch analytics', code: 'ANALYTICS_ERROR' },
          { status: 500 }
        );
      }

      return NextResponse.json({ stats });
    }

    if (type === 'timeseries') {
      const endDate = new Date();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await conversationStore.getAnalytics({
        startDate,
        endDate,
        limit: days * 24,
      });

      return NextResponse.json({ analytics });
    }

    // Get conversation breakdown by persona
    if (type === 'breakdown') {
      const { data: personaBreakdown, error: personaError } = await supabase
        .from('lexi_conversations')
        .select('persona')
        .limit(10000);

      if (personaError) {
        return NextResponse.json(
          { error: 'Failed to fetch breakdown', code: 'BREAKDOWN_ERROR' },
          { status: 500 }
        );
      }

      const breakdown: Record<string, number> = {};
      personaBreakdown?.forEach(c => {
        breakdown[c.persona] = (breakdown[c.persona] || 0) + 1;
      });

      // Get provider breakdown
      const { data: providerData } = await supabase
        .from('lexi_conversations')
        .select('provider')
        .limit(10000);

      const providerBreakdown: Record<string, number> = {};
      providerData?.forEach(c => {
        providerBreakdown[c.provider] = (providerBreakdown[c.provider] || 0) + 1;
      });

      return NextResponse.json({
        breakdown: {
          byPersona: breakdown,
          byProvider: providerBreakdown,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid type parameter', code: 'INVALID_PARAMS' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Lexi Admin API] Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
