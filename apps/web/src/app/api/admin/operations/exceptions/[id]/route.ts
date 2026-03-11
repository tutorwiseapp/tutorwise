/**
 * GET    /api/admin/operations/exceptions/[id] — Get exception detail
 * PATCH  /api/admin/operations/exceptions/[id] — Claim, resolve, or dismiss exception
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('workflow_exceptions')
      .select('*, claimed_by_profile:profiles!workflow_exceptions_claimed_by_fkey(full_name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action, resolution, resolution_type } = body as {
      action: string;
      resolution?: string;
      resolution_type?: string;
    };

    const VALID_ACTIONS = ['claim', 'resolve', 'dismiss'] as const;
    const VALID_RESOLUTION_TYPES = ['fixed', 'dismissed', 'escalated', 'auto_resolved'] as const;

    if (!action || !(VALID_ACTIONS as readonly string[]).includes(action)) {
      return NextResponse.json({ error: `action is required and must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    if (resolution_type && !(VALID_RESOLUTION_TYPES as readonly string[]).includes(resolution_type)) {
      return NextResponse.json({ error: `resolution_type must be one of: ${VALID_RESOLUTION_TYPES.join(', ')}` }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let update: Record<string, any> = {};

    switch (action) {
      case 'claim':
        update = {
          status: 'claimed',
          claimed_by: user.id,
          claimed_at: new Date().toISOString(),
        };
        break;

      case 'resolve':
        update = {
          status: 'resolved',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution: resolution ?? null,
          resolution_type: (resolution_type as 'fixed' | 'dismissed' | 'escalated' | 'auto_resolved') ?? 'fixed',
        };
        break;

      case 'dismiss':
        update = {
          status: 'dismissed',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution: resolution ?? 'Dismissed by admin',
          resolution_type: 'dismissed',
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // State-transition guard: only allow valid transitions
    let statusGuard: string[];
    switch (action) {
      case 'claim': statusGuard = ['open']; break;
      case 'resolve': statusGuard = ['open', 'claimed']; break;
      case 'dismiss': statusGuard = ['open', 'claimed']; break;
      default: statusGuard = []; break;
    }

    const { data, error } = await supabase
      .from('workflow_exceptions')
      .update(update)
      .eq('id', id)
      .in('status', statusGuard)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Exception not found or invalid state transition' }, { status: 409 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
