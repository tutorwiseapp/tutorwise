/**
 * POST /api/admin/mcp/connections/[id]/sync — Discover tools from MCP server
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { getMCPClientManager } from '@/lib/mcp/MCPClientManager';

async function requireAdmin() {
  const authClient = await createClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  // Look up connection slug
  const { data: conn, error } = await supabase
    .from('mcp_connections')
    .select('slug')
    .eq('id', id)
    .single();

  if (error || !conn) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  try {
    const tools = await getMCPClientManager().syncTools(conn.slug);
    return NextResponse.json({ tools, count: tools.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Update connection status to error
    await supabase
      .from('mcp_connections')
      .update({ status: 'error', error_message: msg })
      .eq('id', id);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
