/**
 * Proactive Nudge Scheduler
 * Runs every 4 hours via pg_cron → POST /api/cron/process-nudges.
 * Checks active tutor profiles for 4 nudge conditions with 7-day cooldowns.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

export interface NudgeReport {
  checked: number;
  nudgesSent: number;
  breakdown: Record<string, number>;
  duration_ms: number;
}

const COOLDOWN_DAYS = 7;
type NudgeType = 'quality_brief' | 'score_dropped' | 'pending_messages' | 'booking_tips';

interface TutorProfile {
  id: string;
  user_id: string;
  caas_score: number | null;
  last_login_at: string | null;
}

async function hasCooldown(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, entityId: string, nudgeType: string): Promise<boolean> {
  const { data } = await supabase
    .from('workflow_entity_cooldowns')
    .select('cooldown_until')
    .eq('entity_id', entityId)
    .eq('entity_type', `nudge_${nudgeType}`)
    .gt('cooldown_until', new Date().toISOString())
    .maybeSingle();
  return !!data;
}

async function setCooldown(supabase: Awaited<ReturnType<typeof createServiceRoleClient>>, entityId: string, nudgeType: string): Promise<void> {
  const cooldownUntil = new Date(Date.now() + COOLDOWN_DAYS * 86400000).toISOString();
  await supabase
    .from('workflow_entity_cooldowns')
    .upsert({
      entity_id: entityId,
      entity_type: `nudge_${nudgeType}`,
      last_workflow_at: new Date().toISOString(),
      last_workflow_type: `nudge_${nudgeType}`,
      cooldown_until: cooldownUntil,
    });
}

async function sendNudge(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
  title: string,
  message: string,
  type: NudgeType
): Promise<void> {
  await supabase
    .from('platform_notifications')
    .insert({ user_id: userId, title, message, type: 'nudge', metadata: { nudge_type: type } });
}

export async function processNudges(): Promise<NudgeReport> {
  const startTime = Date.now();
  const supabase = await createServiceRoleClient();
  const breakdown: Record<string, number> = {};
  let nudgesSent = 0;

  // Load active tutor profiles (Bug 6 fix: use profiles.last_login_at instead of auth.users)
  const { data: tutors, error } = await supabase
    .from('profiles')
    .select('id, user_id, caas_score, last_login_at')
    .eq('role', 'tutor')
    .eq('status', 'active')
    .limit(500);

  if (error) throw new Error(`processNudges: ${error.message}`);

  const profiles = (tutors ?? []) as TutorProfile[];
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  const since3d = new Date(Date.now() - 3 * 86400000).toISOString();

  for (const profile of profiles) {
    const score = profile.caas_score ?? 50;

    // ── Condition 1: Low score → AI quality brief ──
    // Note: listing_views table not yet available; fires on caas_score < 40 alone
    if (score < 40) {
      const nudgeType: NudgeType = 'quality_brief';
      if (!(await hasCooldown(supabase, profile.id, nudgeType))) {
        await sendNudge(
          supabase, profile.user_id,
          'Improve your profile visibility',
          'Your growth score is below 40. Review your profile quality to attract more bookings.',
          nudgeType
        );
        await setCooldown(supabase, profile.id, nudgeType);
        breakdown[nudgeType] = (breakdown[nudgeType] ?? 0) + 1;
        nudgesSent++;
      }
    }

    // ── Condition 2: score dropped > 5pts in 7d ──
    // TODO: enable fully when growth_score_history table exists (migration 345)
    {
      const nudgeType: NudgeType = 'score_dropped';
      if (!(await hasCooldown(supabase, profile.id, nudgeType))) {
        try {
          const { data: prevScores } = await supabase
            .from('growth_score_history')
            .select('score')
            .eq('profile_id', profile.id)
            .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
            .order('created_at', { ascending: true })
            .limit(1);

          const prevScore = prevScores?.[0]?.score as number | undefined;
          if (prevScore !== undefined && score < prevScore - 5) {
            await sendNudge(
              supabase, profile.user_id,
              'Your growth score has dropped',
              `Your growth score dropped from ${prevScore} to ${score} this week. Check your recent activity to understand why.`,
              nudgeType
            );
            await setCooldown(supabase, profile.id, nudgeType);
            breakdown[nudgeType] = (breakdown[nudgeType] ?? 0) + 1;
            nudgesSent++;
          }
        } catch {
          // Silently skip: growth_score_history table not yet available
        }
      }
    }

    // ── Condition 3: unread messages > 3 AND last login > 3d ──
    // Bug 5 fix: use chat_messages with receiver_id + read boolean
    // Bug 6 fix: use profiles.last_login_at (already loaded above)
    {
      const nudgeType: NudgeType = 'pending_messages';
      if (!(await hasCooldown(supabase, profile.id, nudgeType))) {
        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', profile.user_id)
          .eq('read', false);

        const lastLogin = profile.last_login_at;
        const inactiveEnough = !lastLogin || lastLogin < since3d;

        if ((unreadCount ?? 0) > 3 && inactiveEnough) {
          await sendNudge(
            supabase, profile.user_id,
            'You have pending messages',
            `You have ${unreadCount} unread messages. Reply soon to keep your response rate high.`,
            nudgeType
          );
          await setCooldown(supabase, profile.id, nudgeType);
          breakdown[nudgeType] = (breakdown[nudgeType] ?? 0) + 1;
          nudgesSent++;
        }
      }
    }

    // ── Condition 4: no bookings in 30d AND has active listings ──
    {
      const nudgeType: NudgeType = 'booking_tips';
      if (!(await hasCooldown(supabase, profile.id, nudgeType))) {
        const [{ count: recentBookings }, { count: activeListings }] = await Promise.all([
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('tutor_profile_id', profile.id)
            .gte('created_at', since30d),
          supabase
            .from('listings')
            .select('id', { count: 'exact', head: true })
            .eq('profile_id', profile.id)
            .eq('status', 'active'),
        ]);

        if ((recentBookings ?? 0) === 0 && (activeListings ?? 0) > 0) {
          await sendNudge(
            supabase, profile.user_id,
            'No bookings in 30 days',
            'You have active listings but no bookings this month. Consider updating your pricing, photos, or description to attract students.',
            nudgeType
          );
          await setCooldown(supabase, profile.id, nudgeType);
          breakdown[nudgeType] = (breakdown[nudgeType] ?? 0) + 1;
          nudgesSent++;
        }
      }
    }
  }

  return {
    checked: profiles.length,
    nudgesSent,
    breakdown,
    duration_ms: Date.now() - startTime,
  };
}
