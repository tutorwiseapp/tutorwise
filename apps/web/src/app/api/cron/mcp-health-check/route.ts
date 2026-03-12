/**
 * POST /api/cron/mcp-health-check — Health check all active MCP connections
 * Called by pg_cron every 5 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { getMCPClientManager } from '@/lib/mcp/MCPClientManager';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const { data: connections } = await supabase
    .from('mcp_connections')
    .select('slug')
    .eq('status', 'active');

  if (!connections || connections.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  const manager = getMCPClientManager();
  const results: Record<string, boolean> = {};

  try {
    for (const conn of connections) {
      results[conn.slug] = await manager.healthCheck(conn.slug);
    }
  } catch (err) {
    console.error('[mcp-health-check] Unexpected error:', err);
    return NextResponse.json({ checked: Object.keys(results).length, results, error: 'partial' }, { status: 207 });
  }

  return NextResponse.json({ checked: connections.length, results });
}
