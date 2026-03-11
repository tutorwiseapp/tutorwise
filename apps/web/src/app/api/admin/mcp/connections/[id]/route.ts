/**
 * PATCH  /api/admin/mcp/connections/[id] — Update a connection
 * DELETE /api/admin/mcp/connections/[id] — Delete a connection (cascades tools)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

async function requireAdmin() {
  const authClient = await createClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = await createServiceRoleClient();
  const body = await req.json();

  const allowed = ['name', 'server_url', 'credential_type', 'credentials', 'metadata', 'status'];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('mcp_connections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  // Disconnect client if active
  try {
    const { data: conn } = await supabase
      .from('mcp_connections')
      .select('slug')
      .eq('id', id)
      .single();

    if (conn?.slug) {
      const { getMCPClientManager } = await import('@/lib/mcp/MCPClientManager');
      await getMCPClientManager().disconnect(conn.slug);
    }
  } catch {
    // Best-effort disconnect
  }

  const { error } = await supabase
    .from('mcp_connections')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
