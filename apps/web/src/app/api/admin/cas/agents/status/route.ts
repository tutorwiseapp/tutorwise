/**
 * GET /api/admin/cas/agents/status
 *
 * Phase 6D: Legacy CAS agent status endpoint. Still functional —
 * reads from cas_agent_status table. CAS tables will be retired in Phase 6D migration.
 * New monitoring is via /api/admin/agents/* (specialist_agents) and workflow_executions.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cas_agent_status')
      .select('agent_id, status, last_activity_at, error_message, metadata, updated_at')
      .order('agent_id');

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: data ?? [], _deprecated: 'Use /api/admin/agents for agent management' },
      { headers: { Deprecation: 'true', Link: '</api/admin/agents>; rel="successor-version"' } }
    );
  } catch (err) {
    console.error('[GET /api/admin/cas/agents/status]', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CAS agent status' },
      { status: 500 }
    );
  }
}
