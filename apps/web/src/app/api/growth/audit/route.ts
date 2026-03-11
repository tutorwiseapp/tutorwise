/**
 * Growth Agent Revenue Audit API
 *
 * POST /api/growth/audit - Run a free Revenue Audit (no subscription required)
 *
 * This is the free-tier entry point for Growth Agent. Users provide their
 * income metrics and receive a personalised revenue audit with top opportunities.
 * No rate limiting — this is a lead-gen / conversion tool.
 *
 * @module api/growth/audit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { growthOrchestrator } from '@growth/core/orchestrator';
import type { GrowthUserMetrics } from '@growth/tools/types';

/**
 * POST /api/growth/audit
 * Run a free Revenue Audit for the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Accept optional user-provided metrics to enrich the audit
    // (supplements DB-fetched data with self-reported info like cashReservesMonths)
    const body = await request.json().catch(() => ({}));
    const overrides: Partial<GrowthUserMetrics> = body.metrics || {};

    // Fetch live metrics from DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('hourly_rate, is_employed_as_teacher, teacher_salary_pence, market')
      .eq('id', user.id)
      .single();

    const { data: listing } = await supabase
      .from('listings')
      .select('subject, listing_level, word_count')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('client_id', { count: 'exact', head: true })
      .eq('tutor_id', user.id)
      .eq('status', 'confirmed');

    // agent_id is the referrer (renamed from referrer_id in migration 052)
    const { data: referrals } = await supabase
      .from('referrals')
      .select('status, commission_amount_pence')
      .eq('agent_id', user.id);

    const { data: aiTutor } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    const { data: org } = await supabase
      .from('connection_groups')
      .select('id, member_count')
      .eq('owner_id', user.id)
      .eq('type', 'organisation')
      .limit(1)
      .maybeSingle();

    const referralList = referrals ?? [];
    const referralCount = referralList.length;
    const convertedReferrals = referralList.filter((r: { status: string }) => r.status === 'converted').length;
    const referralEarningsMonthly = referralList
      .filter((r: { status: string }) => r.status === 'converted')
      .reduce((sum: number, r: { commission_amount_pence: number }) => sum + (r.commission_amount_pence || 0), 0);

    const hourlyRate = profile?.hourly_rate ?? 0;
    const activeStudents = bookingCount ?? 0;
    const estimatedMonthlyIncome = hourlyRate * activeStudents * 4;

    const metrics: GrowthUserMetrics = {
      activeStudents,
      monthlyIncome: estimatedMonthlyIncome,
      hourlyRate,
      hasListing: !!listing,
      listingSubject: listing?.subject ?? undefined,
      listingLevel: listing?.listing_level ?? undefined,
      listingWordCount: listing?.word_count ?? undefined,
      referralCount,
      convertedReferrals,
      referralEarningsMonthly,
      hasAITutor: !!aiTutor,
      aiTutorEarningsMonthly: undefined,
      isOrganisation: !!org,
      orgMemberCount: org?.member_count ?? undefined,
      isEmployedAsTeacher: profile?.is_employed_as_teacher ?? false,
      teacherSalary: profile?.teacher_salary_pence ?? undefined,
      cashReservesMonths: overrides.cashReservesMonths,
      market: profile?.market ?? 'uk',
      ...overrides,
    };

    const audit = await growthOrchestrator.runRevenueAudit(metrics);

    return NextResponse.json({
      audit,
      metrics: {
        activeStudents: metrics.activeStudents,
        monthlyIncome: metrics.monthlyIncome,
        hasListing: metrics.hasListing,
        referralCount: metrics.referralCount,
        hasAITutor: metrics.hasAITutor,
        isOrganisation: metrics.isOrganisation,
      },
    });
  } catch (error) {
    console.error('[Growth Audit] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
