/**
 * Growth Agent Session API
 *
 * POST /api/growth/session - Start a new Growth Agent session
 * GET /api/growth/session  - Get current session details
 * DELETE /api/growth/session - End a Growth session
 *
 * @module api/growth/session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { growthOrchestrator } from '@growth/core/orchestrator';
import type { GrowthUserRole, GrowthUserMetrics } from '@growth/tools/types';
import { fetchPlatformUserContext, formatPlatformContextForPrompt } from '@/lib/platform/user-context';

// ============================================================================
// HELPERS
// ============================================================================

function mapRoleToGrowthRole(role?: string): GrowthUserRole {
  switch (role) {
    case 'tutor': return 'tutor';
    case 'client': return 'client';
    case 'agent': return 'agent';
    case 'organisation': return 'organisation';
    default: return 'tutor';
  }
}

/**
 * Fetch live Growth metrics for the user from the database.
 * All monetary values in pence (matching GrowthUserMetrics convention).
 */
async function fetchGrowthMetrics(
  userId: string,
  supabase: ReturnType<typeof createServerClient>
): Promise<GrowthUserMetrics> {
  // Run queries in parallel for performance
  const [profileRes, listingRes, bookingsRes, referralsRes, aiTutorRes, orgRes] =
    await Promise.all([
      // Profile
      supabase
        .from('profiles')
        .select('hourly_rate, is_employed_as_teacher, teacher_salary_pence, market')
        .eq('id', userId)
        .single(),

      // Listing
      supabase
        .from('listings')
        .select('subject, listing_level, word_count')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single(),

      // Active students (distinct from confirmed bookings in last 30 days)
      supabase
        .from('bookings')
        .select('client_id', { count: 'exact' })
        .eq('tutor_id', userId)
        .eq('status', 'confirmed'),

      // Referrals (agent_id is the referrer, renamed from referrer_id in migration 052)
      supabase
        .from('referrals')
        .select('status, commission_amount_pence')
        .eq('agent_id', userId),

      // AI Tutor
      supabase
        .from('ai_agents')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single(),

      // Organisation membership
      supabase
        .from('connection_groups')
        .select('id, member_count')
        .eq('owner_id', userId)
        .eq('type', 'organisation')
        .limit(1)
        .single(),
    ]);

  const profile = profileRes.data;
  const listing = listingRes.data;
  const bookingCount = bookingsRes.count ?? 0;
  const referrals = referralsRes.data ?? [];
  const aiTutor = aiTutorRes.data;
  const org = orgRes.data;

  // Calculate referral metrics
  const referralCount = referrals.length;
  const convertedReferrals = referrals.filter((r: { status: string }) => r.status === 'converted').length;
  const referralEarningsMonthly = referrals
    .filter((r: { status: string }) => r.status === 'converted')
    .reduce((sum: number, r: { commission_amount_pence: number }) => sum + (r.commission_amount_pence || 0), 0);

  // Estimate monthly income (hourly_rate * avg sessions per week * 4)
  const hourlyRate = profile?.hourly_rate ?? 0; // already in pence
  const estimatedMonthlyIncome = hourlyRate * bookingCount * 4; // rough estimate

  return {
    activeStudents: bookingCount,
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
    aiTutorEarningsMonthly: undefined, // TODO: query ai_agent_subscriptions
    isOrganisation: !!org,
    orgMemberCount: org?.member_count ?? undefined,
    isEmployedAsTeacher: profile?.is_employed_as_teacher ?? false,
    teacherSalary: profile?.teacher_salary_pence ?? undefined,
    cashReservesMonths: undefined, // user-provided, not in DB
    market: profile?.market ?? 'uk',
  };
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /api/growth/session
 * Start a new Growth Agent session. Fetches live metrics and injects them.
 */
export async function POST(_request: NextRequest) {
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

    // Get user profile for role + display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_role, full_name, display_name')
      .eq('id', user.id)
      .single();

    const role = mapRoleToGrowthRole(profile?.active_role);
    const firstName = profile?.display_name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || 'there';

    // Start session
    const sessionId = `growth_${randomUUID()}`;
    growthOrchestrator.startSession(user.id, role);

    // Fetch metrics (async — enrich system prompt)
    let metrics: GrowthUserMetrics | undefined;
    try {
      metrics = await fetchGrowthMetrics(user.id, supabase);
      growthOrchestrator.setSessionMetrics(sessionId, metrics);
    } catch (metricsError) {
      console.warn('[Growth Session] Could not fetch metrics (continuing without):', metricsError);
    }

    const greeting = growthOrchestrator.getGreeting(role, firstName);
    const suggestions = growthOrchestrator.getSuggestions(role);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    // Fetch PlatformUserContext (fire-and-forget on error — non-blocking)
    let platformContextBlock: string | undefined;
    try {
      const ctx = await fetchPlatformUserContext(user.id);
      platformContextBlock = formatPlatformContextForPrompt(ctx);
    } catch {
      // Context enrichment is best-effort — never fail session creation
    }

    return NextResponse.json({
      sessionId,
      role,
      greeting,
      suggestions,
      user: {
        name: profile?.full_name || 'User',
        role,
      },
      metrics: metrics ? {
        activeStudents: metrics.activeStudents,
        monthlyIncome: metrics.monthlyIncome,
        hasListing: metrics.hasListing,
        referralCount: metrics.referralCount,
        hasAITutor: metrics.hasAITutor,
      } : undefined,
      capabilities: {
        streaming: true,
        roles: ['tutor', 'agent', 'client', 'organisation'],
        features: ['revenue_audit', 'pricing_benchmark', 'referral_strategy', 'income_streams', 'business_setup'],
      },
      expiresAt: expiresAt.toISOString(),
      platformContextBlock, // injected into Growth system prompt on first turn
    });
  } catch (error) {
    console.error('[Growth Session] Creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/growth/session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required', code: 'MISSING_SESSION_ID' },
        { status: 400 }
      );
    }

    growthOrchestrator.endSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Growth Session] Delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
