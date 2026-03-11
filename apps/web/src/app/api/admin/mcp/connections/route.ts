/**
 * GET  /api/admin/mcp/connections — List all MCP connections
 * POST /api/admin/mcp/connections — Register a new MCP server
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

async function requireAdmin() {
  const authClient = await createClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('mcp_connections')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = await createServiceRoleClient();
  const body = await req.json();

  const { slug, name, server_url, transport, credential_type, credentials, metadata } = body;

  if (!slug || !name || !server_url) {
    return NextResponse.json({ error: 'slug, name, and server_url are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mcp_connections')
    .insert({
      slug,
      name,
      server_url,
      transport: transport ?? 'http',
      credential_type: credential_type ?? 'api_key',
      credentials: credentials ?? {},
      metadata: metadata ?? {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
