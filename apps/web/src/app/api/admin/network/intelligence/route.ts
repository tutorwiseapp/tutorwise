/*
 * Filename: src/app/api/admin/network/intelligence/route.ts
 * Purpose: Network Intelligence — referral graph, org health, attribution
 * Phase: Conductor 4C-ii
 * Created: 2026-03-10
 *
 * GET /api/admin/network/intelligence
 * Powers the /admin/network/ page: Network Health, Organisation, Attribution tabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Run all queries in parallel
    const [networkStatsRes, referralTrendRes, orgHealthRes, topReferrersRes] = await Promise.all([

      // Network Health: referral_network_stats materialized view (migration 365)
      supabase
        .from('referral_network_stats')
        .select('*')
        .limit(1)
        .single(),

      // Referral velocity: last 30 days trend from referral_metrics_daily
      supabase
        .from('referral_metrics_daily')
        .select('snapshot_date, new_referrals, converted_referrals, k_coefficient, avg_depth')
        .order('snapshot_date', { ascending: false })
        .limit(30),

      // Organisation health: connection_groups with tutor activity
      supabase
        .from('connection_groups')
        .select(`
          id, name, member_count,
          profiles!connection_groups_profile_id_fkey (
            id, caas_score, full_name
          )
        `)
        .eq('type', 'organisation')
        .order('member_count', { ascending: false })
        .limit(20),

      // Top referrers by lifetime commission (attribution)
      supabase
        .from('referrals')
        .select('referrer_id, commission_amount_pence, status')
        .eq('status', 'converted'),
    ]);

    const networkStats = networkStatsRes.data;
    const referralTrend = referralTrendRes.data ?? [];
    const orgs = orgHealthRes.data ?? [];
    const referrals = topReferrersRes.data ?? [];

    // Compute top referrers by LTV (sum of commission_amount_pence per referrer_id)
    const referrerMap: Record<string, number> = {};
    for (const r of referrals as any[]) {
      if (r.referrer_id) {
        referrerMap[r.referrer_id] = (referrerMap[r.referrer_id] ?? 0) + (r.commission_amount_pence ?? 0);
      }
    }
    const topReferrerIds = Object.entries(referrerMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    // Fetch profiles for top referrers
    let topReferrers: any[] = [];
    if (topReferrerIds.length > 0) {
      const { data: referrerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, active_role')
        .in('id', topReferrerIds);

      topReferrers = topReferrerIds.map((id) => {
        const profile = (referrerProfiles ?? []).find((p: any) => p.id === id);
        return {
          profile_id: id,
          full_name: profile?.full_name ?? 'Unknown',
          role: profile?.active_role ?? 'tutor',
          lifetime_commission_pence: referrerMap[id] ?? 0,
          referral_count: (referrals as any[]).filter((r) => r.referrer_id === id).length,
        };
      });
    }

    // Organisation health score = avg caas_score of org members (proxy)
    const orgHealth = orgs.map((org: any) => {
      const founderCaas = org.profiles?.caas_score ?? null;
      const healthScore = founderCaas !== null ? Math.min(100, founderCaas) : null;
      const isAtRisk = healthScore !== null && healthScore < 50;
      return {
        id: org.id,
        name: org.name,
        member_count: org.member_count ?? 0,
        health_score: healthScore,
        status: isAtRisk ? 'at-risk' : (healthScore !== null && healthScore >= 70 ? 'healthy' : 'needs-attention'),
      };
    });

    // Compute referral velocity change (last 7d vs prior 7d)
    const last7 = referralTrend.slice(0, 7);
    const prior7 = referralTrend.slice(7, 14);
    const last7Total = last7.reduce((sum: number, r: any) => sum + (r.new_referrals ?? 0), 0);
    const prior7Total = prior7.reduce((sum: number, r: any) => sum + (r.new_referrals ?? 0), 0);
    const velocityChangePct = prior7Total > 0
      ? Math.round(((last7Total - prior7Total) / prior7Total) * 100)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        network_health: {
          avg_depth: networkStats?.avg_depth ?? null,
          max_depth: networkStats?.max_depth ?? null,
          hub_count: networkStats?.hub_count ?? null,
          ghost_rate_pct: networkStats?.ghost_rate_pct ?? null,
          delegation_adoption_pct: networkStats?.delegation_adoption_pct ?? null,
          refreshed_at: networkStats?.refreshed_at ?? null,
          velocity_change_pct: velocityChangePct,
          last_30_days_trend: referralTrend.map((r: any) => ({
            date: r.snapshot_date,
            new_referrals: r.new_referrals,
            converted: r.converted_referrals,
            k_coefficient: r.k_coefficient,
          })),
        },
        organisations: orgHealth,
        attribution: {
          top_referrers: topReferrers,
          total_attributed_pence: Object.values(referrerMap).reduce((a, b) => a + b, 0),
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
