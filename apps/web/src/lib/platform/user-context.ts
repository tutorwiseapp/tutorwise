/*
 * Filename: src/lib/platform/user-context.ts
 * Purpose: PlatformUserContext — full platform state snapshot for conversational agents
 * Phase: Conductor 4C
 * Created: 2026-03-10
 *
 * Fetched server-side at session start for Sage, Lexi, and Growth.
 * Injected as a structured block in the system prompt — agents can reference
 * the user's current platform state without making additional tool calls.
 *
 * Redis-cached per user for 5 minutes (see context-cache.ts).
 *
 * Schema is enriched with Phase 3 intelligence data:
 *  - growth_score from growth_scores table
 *  - referral stats from referrals table
 *  - listing health from listings table
 *  - ai_agent_active from ai_agents table
 */

import { createClient } from '@/utils/supabase/server';
import { getCachedContext, setCachedContext } from './context-cache';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformUserContext {
  profile: {
    role: 'tutor' | 'client' | 'agent' | 'organisation';
    caas_score: number | null;
    listing_count: number;
    active_since: string | null;
    verified: boolean;
    profile_completeness: number | null;
  };
  earnings: {
    this_month_pence: number;
    pending_payout_pence: number;
    stripe_connected: boolean;
  };
  bookings: {
    upcoming_count: number;
    past_30_days: number;
    cancellation_rate: number | null;
    next_booking_date: string | null;
  };
  sage: {
    has_pro: boolean;
    sessions_this_month: number;
    last_session_subject: string | null;
  };
  growth: {
    has_pro: boolean;
    sessions_this_month: number;
    growth_score: number | null;  // from growth_scores table (Phase 3)
  };
  lexi: {
    open_issues: string[];
  };
  processes: {
    pending_approvals: Array<{ id: string; type: string; waiting_hours: number }>;
    recent_executions: Array<{ process_name: string; status: string; completed_at: string }>;
  };
  referrals: {
    referrals_sent: number;
    referrals_converted: number;
    lifetime_commission_pence: number;
    active_referral_code: string | null;
  };
  marketplace: {
    ai_agent_active: boolean;
    average_rating: number | null;
  };
  signals: {
    unread_messages: number;
    incomplete_profile_fields: string[];
    caas_below_threshold: boolean;   // caas_score < 70
    growth_score_below_50: boolean;
    referral_conversion_low: boolean;  // < 10% conversion
  };
}

// ── Build context ─────────────────────────────────────────────────────────────

/**
 * Fetch a full PlatformUserContext for the given user ID.
 * All queries run in parallel. Missing data degrades gracefully to null/defaults.
 */
export async function buildPlatformUserContext(userId: string): Promise<PlatformUserContext> {
  const supabase = await createClient();

  // Parallel queries for all data sources
  const [
    profileRes,
    listingsRes,
    bookingsUpcomingRes,
    bookingsPast30Res,
    sageSubRes,
    sageProRes,
    growthProRes,
    growthScoreRes,
    referralsRes,
    aiAgentRes,
    wfPendingRes,
    wfRecentRes,
  ] = await Promise.allSettled([
    // Profile: role, caas_score, created_at, verified
    supabase
      .from('profiles')
      .select('active_role, caas_score, created_at, status')
      .eq('id', userId)
      .single(),

    // Listings: count, avg rating
    supabase
      .from('listings')
      .select('id, average_rating')
      .eq('user_id', userId)
      .eq('status', 'active'),

    // Upcoming bookings
    supabase
      .from('bookings')
      .select('id, scheduled_at')
      .eq('tutor_id', userId)
      .eq('status', 'confirmed')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10),

    // Past 30 days bookings
    supabase
      .from('bookings')
      .select('id, status')
      .eq('tutor_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

    // Last sage session subject
    supabase
      .from('sage_sessions')
      .select('subject, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),

    // Sage Pro subscription
    supabase
      .from('sage_pro_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single(),

    // Growth Pro subscription
    supabase
      .from('growth_pro_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single(),

    // Growth score (Phase 3)
    supabase
      .from('growth_scores')
      .select('score')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .single(),

    // Referrals (as referrer)
    supabase
      .from('referrals')
      .select('status, commission_amount_pence')
      .eq('referrer_id', userId),

    // AI agent active
    supabase
      .from('ai_agents')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .single(),

    // Pending workflow approvals for this user
    supabase
      .from('workflow_executions')
      .select('id, status, started_at, workflow_processes(name)')
      .eq('target_entity_id', userId)
      .eq('status', 'paused')
      .limit(5),

    // Recent workflow executions
    supabase
      .from('workflow_executions')
      .select('id, status, completed_at, workflow_processes(name)')
      .eq('target_entity_id', userId)
      .in('status', ['completed', 'failed'])
      .order('completed_at', { ascending: false })
      .limit(3),
  ]);

  // Extract data with graceful fallbacks
  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
  const listings = listingsRes.status === 'fulfilled' ? (listingsRes.value.data ?? []) : [];
  const bookingsUpcoming = bookingsUpcomingRes.status === 'fulfilled' ? (bookingsUpcomingRes.value.data ?? []) : [];
  const bookingsPast30 = bookingsPast30Res.status === 'fulfilled' ? (bookingsPast30Res.value.data ?? []) : [];
  const lastSageSession = sageSubRes.status === 'fulfilled' ? sageSubRes.value.data : null;
  const sagePro = sageProRes.status === 'fulfilled' ? sageProRes.value.data : null;
  const growthPro = growthProRes.status === 'fulfilled' ? growthProRes.value.data : null;
  const growthScore = growthScoreRes.status === 'fulfilled' ? growthScoreRes.value.data : null;
  const referrals = referralsRes.status === 'fulfilled' ? (referralsRes.value.data ?? []) : [];
  const aiAgent = aiAgentRes.status === 'fulfilled' ? aiAgentRes.value.data : null;
  const wfPending = wfPendingRes.status === 'fulfilled' ? (wfPendingRes.value.data ?? []) : [];
  const wfRecent = wfRecentRes.status === 'fulfilled' ? (wfRecentRes.value.data ?? []) : [];

  // Derived values
  const caasScore = profile?.caas_score ?? null;
  const referralsSent = referrals.length;
  const referralsConverted = referrals.filter((r: any) => r.status === 'converted').length;
  const lifetimeCommission = referrals
    .filter((r: any) => r.status === 'converted')
    .reduce((sum: number, r: any) => sum + (r.commission_amount_pence ?? 0), 0);

  const cancelledPast30 = bookingsPast30.filter((b: any) => b.status === 'cancelled').length;
  const cancellationRate = bookingsPast30.length > 0
    ? Math.round((cancelledPast30 / bookingsPast30.length) * 100)
    : null;

  const avgRating = listings.length > 0
    ? listings.reduce((sum: number, l: any) => sum + (l.average_rating ?? 0), 0) / listings.filter((l: any) => l.average_rating).length || null
    : null;

  const pendingApprovals = wfPending.map((we: any) => ({
    id: we.id,
    type: (we as any).workflow_processes?.name ?? 'Unknown',
    waiting_hours: Math.round((Date.now() - new Date(we.started_at).getTime()) / (1000 * 60 * 60)),
  }));

  const recentExecutions = wfRecent.map((we: any) => ({
    process_name: (we as any).workflow_processes?.name ?? 'Unknown',
    status: we.status,
    completed_at: we.completed_at ?? '',
  }));

  return {
    profile: {
      role: (profile?.active_role as any) ?? 'tutor',
      caas_score: caasScore,
      listing_count: listings.length,
      active_since: profile?.created_at ?? null,
      verified: profile?.status === 'active',
      profile_completeness: null, // compute_listing_completeness_score() — future
    },
    earnings: {
      this_month_pence: 0, // Future: query ledger/payout tables
      pending_payout_pence: 0,
      stripe_connected: false,
    },
    bookings: {
      upcoming_count: bookingsUpcoming.length,
      past_30_days: bookingsPast30.length,
      cancellation_rate: cancellationRate,
      next_booking_date: bookingsUpcoming[0]?.scheduled_at ?? null,
    },
    sage: {
      has_pro: sagePro?.status === 'active',
      sessions_this_month: 0, // Future: count sage_sessions this month
      last_session_subject: (lastSageSession as any)?.subject ?? null,
    },
    growth: {
      has_pro: growthPro?.status === 'active',
      sessions_this_month: 0, // Future: query growth_usage_log
      growth_score: growthScore?.score ?? null,
    },
    lexi: {
      open_issues: [],
    },
    processes: {
      pending_approvals: pendingApprovals,
      recent_executions: recentExecutions,
    },
    referrals: {
      referrals_sent: referralsSent,
      referrals_converted: referralsConverted,
      lifetime_commission_pence: lifetimeCommission,
      active_referral_code: null, // Future: query referral_codes table
    },
    marketplace: {
      ai_agent_active: !!aiAgent,
      average_rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    },
    signals: {
      unread_messages: 0, // Future: query messages table
      incomplete_profile_fields: [],
      caas_below_threshold: caasScore !== null && caasScore < 70,
      growth_score_below_50: growthScore?.score !== null && growthScore?.score !== undefined && growthScore.score < 50,
      referral_conversion_low: referralsSent > 0 && (referralsConverted / referralsSent) < 0.1,
    },
  };
}

/**
 * Fetch PlatformUserContext, using Redis cache if available.
 * Cache miss triggers buildPlatformUserContext() and stores the result.
 */
export async function fetchPlatformUserContext(userId: string): Promise<PlatformUserContext> {
  // Check cache first
  const cached = await getCachedContext(userId);
  if (cached) return cached;

  // Build fresh context
  const ctx = await buildPlatformUserContext(userId);

  // Store in cache (fire-and-forget)
  setCachedContext(userId, ctx).catch(() => {});

  return ctx;
}

// ── System prompt formatter ───────────────────────────────────────────────────

/**
 * Format a PlatformUserContext as a compact block for injection into an agent system prompt.
 * Keeps it concise — agents get the key signals, not raw JSON.
 */
export function formatPlatformContextForPrompt(ctx: PlatformUserContext): string {
  const lines: string[] = ['--- PLATFORM CONTEXT ---'];

  lines.push(`Role: ${ctx.profile.role}`);
  if (ctx.profile.caas_score !== null) lines.push(`CaaS Score: ${ctx.profile.caas_score}/100${ctx.signals.caas_below_threshold ? ' (below 70 featured threshold)' : ''}`);
  if (ctx.profile.listing_count > 0) lines.push(`Active Listings: ${ctx.profile.listing_count}`);
  if (ctx.growth.growth_score !== null) lines.push(`Growth Score: ${ctx.growth.growth_score}/100${ctx.signals.growth_score_below_50 ? ' (below 50)' : ''}`);

  if (ctx.bookings.upcoming_count > 0) lines.push(`Upcoming Bookings: ${ctx.bookings.upcoming_count}`);
  if (ctx.bookings.past_30_days > 0) lines.push(`Bookings Last 30d: ${ctx.bookings.past_30_days}`);
  if (ctx.bookings.next_booking_date) lines.push(`Next Booking: ${ctx.bookings.next_booking_date}`);

  lines.push(`Sage Pro: ${ctx.sage.has_pro ? 'yes' : 'no'}${ctx.sage.last_session_subject ? ` (last: ${ctx.sage.last_session_subject})` : ''}`);
  lines.push(`Growth Pro: ${ctx.growth.has_pro ? 'yes' : 'no'}`);
  lines.push(`AI Agent: ${ctx.marketplace.ai_agent_active ? 'active' : 'inactive'}`);

  if (ctx.referrals.referrals_sent > 0) {
    lines.push(`Referrals: ${ctx.referrals.referrals_sent} sent, ${ctx.referrals.referrals_converted} converted${ctx.signals.referral_conversion_low ? ' (low conversion)' : ''}`);
  }

  if (ctx.processes.pending_approvals.length > 0) {
    lines.push(`Pending Approvals: ${ctx.processes.pending_approvals.map((a) => a.type).join(', ')}`);
  }

  if (ctx.signals.unread_messages > 0) lines.push(`Unread Messages: ${ctx.signals.unread_messages}`);

  lines.push('--- END PLATFORM CONTEXT ---');
  return lines.join('\n');
}
