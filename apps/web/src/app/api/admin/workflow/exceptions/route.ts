/**
 * GET /api/admin/workflow/exceptions
 * Canonical exception listing endpoint for the Conductor platform.
 * Supports filtering by status, severity, source + pagination.
 * Used by MonitoringPanel (Conductor) and Operations page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['open', 'claimed', 'resolved', 'dismissed'] as const;
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const VALID_SOURCES = ['workflow_failure', 'agent_error', 'conformance_deviation', 'webhook_failure', 'shadow_divergence', 'hitl_timeout', 'team_error'] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const source = searchParams.get('source');

    if (status && !(VALID_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    if (severity && !(VALID_SEVERITIES as readonly string[]).includes(severity)) {
      return NextResponse.json({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` }, { status: 400 });
    }
    if (source && !(VALID_SOURCES as readonly string[]).includes(source)) {
      return NextResponse.json({ error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}` }, { status: 400 });
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '100') || 100, 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0') || 0, 0);

    let query = supabase
      .from('workflow_exceptions')
      .select('id, source, severity, status, source_entity_type, source_entity_id, title, description, context, claimed_by, claimed_at, created_at, claimed_by_profile:profiles!workflow_exceptions_claimed_by_fkey(full_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Default: only open/claimed unless explicitly filtered
    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['open', 'claimed']);
    }
    if (severity) query = query.eq('severity', severity);
    if (source) query = query.eq('source', source);

    const { data, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
      limit,
      offset,
      filters: {
        status: status ?? 'open,claimed (default)',
        severity: severity ?? 'all',
        source: source ?? 'all',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}
