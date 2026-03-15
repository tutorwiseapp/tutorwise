/**
 * GET /api/admin/onboarding/stalled
 *
 * Returns list of users stalled at various onboarding stages.
 * Used by the "View list" action in the Onboarding Intelligence panel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limitParam = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50') || 50, 1), 200);

    const svc = createServiceRoleClient();

    // Fetch stalled users from three categories in parallel
    const [midOnboarding, postOnboarding, verifiedNoRole] = await Promise.all([
      // Mid-onboarding stalled (started but inactive > 3 days)
      svc
        .from('onboarding_sessions')
        .select('profile_id, role_type, current_step, total_steps, last_active, started_at')
        .is('completed_at', null)
        .gt('current_step', 0)
        .lt('last_active', new Date(Date.now() - 3 * 86400000).toISOString())
        .order('last_active', { ascending: true })
        .limit(limitParam),

      // Placeholder for future post-onboarding stall query (handled by daily metrics)
      Promise.resolve({ data: null, error: null }),

      // Verified but never selected role (> 7 days)
      svc
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('email_verified', true)
        .is('primary_role', null)
        .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('created_at', { ascending: true })
        .limit(limitParam),
    ]);

    // Build stalled users list
    const users: {
      profile_id: string;
      full_name: string | null;
      email: string | null;
      role: string;
      stalled_stage: string;
      days_stalled: number;
      onboarding_step: number | null;
      total_steps: number | null;
    }[] = [];

    // Mid-onboarding
    if (midOnboarding.data) {
      // Fetch profile details for these users
      const profileIds = midOnboarding.data.map((s: any) => s.profile_id);
      const { data: profiles } = profileIds.length > 0
        ? await svc
            .from('profiles')
            .select('id, full_name, email')
            .in('id', profileIds)
        : { data: [] };

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      for (const session of midOnboarding.data as any[]) {
        const profile = profileMap.get(session.profile_id);
        const daysStalledMs = Date.now() - new Date(session.last_active).getTime();
        users.push({
          profile_id: session.profile_id,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          role: session.role_type,
          stalled_stage: 'mid_onboarding',
          days_stalled: Math.round(daysStalledMs / 86400000),
          onboarding_step: session.current_step,
          total_steps: session.total_steps,
        });
      }
    }

    // Verified no role
    if (verifiedNoRole.data) {
      for (const profile of verifiedNoRole.data as any[]) {
        const daysStalledMs = Date.now() - new Date(profile.created_at).getTime();
        users.push({
          profile_id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          role: 'unknown',
          stalled_stage: 'verified_no_role',
          days_stalled: Math.round(daysStalledMs / 86400000),
          onboarding_step: null,
          total_steps: null,
        });
      }
    }

    // Sort by days_stalled descending (most stalled first)
    users.sort((a, b) => b.days_stalled - a.days_stalled);

    return NextResponse.json({
      success: true,
      data: { users, total: users.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
