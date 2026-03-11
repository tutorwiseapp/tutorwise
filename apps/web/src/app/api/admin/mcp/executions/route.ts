/**
 * GET /api/admin/mcp/executions — Recent MCP tool executions (audit log)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

async function requireAdmin() {
  const authClient = await createClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServiceRoleClient();
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);
  const connectionId = req.nextUrl.searchParams.get('connection_id');

  let query = supabase
    .from('mcp_tool_executions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (connectionId) {
    query = query.eq('connection_id', connectionId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
