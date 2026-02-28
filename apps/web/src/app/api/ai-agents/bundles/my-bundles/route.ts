/**
 * Filename: api/ai-agents/bundles/my-bundles/route.ts
 * Purpose: Get client's active bundles
 * Created: 2026-02-24
 * Phase: 3C - Bundle Pricing
 *
 * Returns all active bundles owned by the authenticated client.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai-agents/bundles/my-bundles
 * Get client's active bundle purchases
 *
 * Query params:
 * - agent_id: filter by specific AI tutor
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const aiAgentId = searchParams.get('agent_id');

    // 3. Build query
    let query = supabase
      .from('ai_agent_bundle_purchases')
      .select(`
        *,
        bundle:ai_agent_bundles!bundle_id(
          id,
          bundle_name,
          description,
          ai_sessions_count,
          human_sessions_count,
          badge_text
        ),
        ai_agent:ai_agents!agent_id(
          id,
          name,
          avatar_url
        )
      `)
      .eq('client_id', user.id)
      .eq('status', 'active');

    // Filter by AI tutor if specified
    if (aiAgentId) {
      query = query.eq('agent_id', aiAgentId);
    }

    const { data: purchases, error } = await query
      .order('purchased_at', { ascending: false });

    if (error) throw error;

    // 4. Filter out expired bundles (client-side check)
    const now = new Date();
    const activePurchases = purchases?.filter(p =>
      !p.expires_at || new Date(p.expires_at) > now
    ) || [];

    return NextResponse.json({
      bundles: activePurchases,
      count: activePurchases.length
    });

  } catch (error) {
    console.error('[My Bundles] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
