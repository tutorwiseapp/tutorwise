/**
 * POST /api/cron/mcp-health-check — Health check all active MCP connections
 * Called by pg_cron every 5 minutes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { getMCPClientManager } from '@/lib/mcp/MCPClientManager';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
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

  for (const conn of connections) {
    results[conn.slug] = await manager.healthCheck(conn.slug);
  }

  return NextResponse.json({ checked: connections.length, results });
}
