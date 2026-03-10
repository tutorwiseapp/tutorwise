/*
 * Filename: src/app/api/platform/user-context/[profile_id]/route.ts
 * Purpose: PlatformUserContext API — fetch full platform state snapshot for a user
 * Phase: Conductor 4C
 * Created: 2026-03-10
 *
 * GET /api/platform/user-context/[profile_id]
 * Used by Sage, Lexi, and Growth session routes to inject context into system prompts.
 * 5-minute Redis cache (see context-cache.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { fetchPlatformUserContext } from '@/lib/platform/user-context';
import { invalidateCachedContext } from '@/lib/platform/context-cache';

export const dynamic = 'force-dynamic';

/** GET /api/platform/user-context/[profile_id] */
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ profile_id: string }> }
) {
  try {
    const { profile_id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Users can only fetch their own context (admins can fetch any)
    if (profile_id !== user.id) {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_role')
        .eq('id', user.id)
        .single();
      const isAdmin = profile?.active_role === 'admin';
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const context = await fetchPlatformUserContext(profile_id);
    return NextResponse.json({ success: true, data: context });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** DELETE /api/platform/user-context/[profile_id] — invalidate cache */
export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ profile_id: string }> }
) {
  try {
    const { profile_id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await invalidateCachedContext(profile_id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
