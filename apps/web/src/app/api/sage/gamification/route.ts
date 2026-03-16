/**
 * Gamification API
 *
 * GET  /api/sage/gamification - Get student XP, level, badges
 * POST /api/sage/gamification - Award XP for an action
 *
 * @module api/sage/gamification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// XP rewards per action type
const XP_REWARDS: Record<string, number> = {
  session_completed: 15,
  assessment_completed: 20,
  perfect_assessment: 50,
  topic_mastered: 30,
  misconception_cleared: 10,
  streak_day: 5,
  study_minutes_10: 5,
};

// Level thresholds (XP required for each level)
function levelFromXP(xp: number): number {
  // Each level requires progressively more XP: level N needs N*100 total XP
  let level = 1;
  let threshold = 100;
  while (xp >= threshold) {
    level++;
    threshold += level * 100;
  }
  return level;
}

function xpForNextLevel(currentLevel: number): number {
  let total = 0;
  for (let i = 1; i <= currentLevel; i++) {
    total += i * 100;
  }
  return total;
}

/**
 * GET /api/sage/gamification
 * Returns student's XP, level, progress to next level, and badges
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = new URL(request.url).searchParams.get('studentId') || user.id;

    // Fetch XP record and badges in parallel
    const [{ data: xpRecord }, { data: earnedBadges }, { data: allBadges }] = await Promise.all([
      supabase
        .from('sage_student_xp')
        .select('*')
        .eq('student_id', studentId)
        .single(),
      supabase
        .from('sage_student_badges')
        .select(`
          id, earned_at,
          badge:sage_badges!badge_id (id, slug, name, description, icon, tier, xp_reward)
        `)
        .eq('student_id', studentId)
        .order('earned_at', { ascending: false }),
      supabase
        .from('sage_badges')
        .select('*')
        .order('sort_order', { ascending: true }),
    ]);

    const totalXP = xpRecord?.total_xp || 0;
    const level = xpRecord?.level || 1;
    const nextLevelXP = xpForNextLevel(level);
    const prevLevelXP = level > 1 ? xpForNextLevel(level - 1) : 0;

    return NextResponse.json({
      xp: {
        total: totalXP,
        level,
        xp_this_week: xpRecord?.xp_this_week || 0,
        xp_to_next_level: nextLevelXP - totalXP,
        progress_percent: Math.round(((totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100),
      },
      badges: {
        earned: earnedBadges || [],
        available: (allBadges || []).map(badge => ({
          ...badge,
          earned: (earnedBadges || []).some(
            (eb: { badge: Array<{ id: string }> }) => eb.badge?.[0]?.id === badge.id
          ),
        })),
      },
    });
  } catch (error) {
    console.error('[Gamification] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/sage/gamification
 * Award XP for a student action and check for new badges
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, metadata } = body as {
      action: string;
      metadata?: Record<string, unknown>;
    };

    if (!action || !XP_REWARDS[action]) {
      return NextResponse.json(
        { error: 'Invalid action', valid_actions: Object.keys(XP_REWARDS) },
        { status: 400 }
      );
    }

    const xpGained = XP_REWARDS[action];

    // Upsert XP record
    const weekStart = getWeekStart();
    const { data: existingXP } = await supabase
      .from('sage_student_xp')
      .select('*')
      .eq('student_id', user.id)
      .single();

    let newTotalXP: number;
    let weeklyXP: number;

    if (existingXP) {
      const sameWeek = existingXP.week_start === weekStart;
      newTotalXP = existingXP.total_xp + xpGained;
      weeklyXP = sameWeek ? existingXP.xp_this_week + xpGained : xpGained;

      await supabase
        .from('sage_student_xp')
        .update({
          total_xp: newTotalXP,
          level: levelFromXP(newTotalXP),
          xp_this_week: weeklyXP,
          week_start: weekStart,
          updated_at: new Date().toISOString(),
        })
        .eq('student_id', user.id);
    } else {
      newTotalXP = xpGained;
      weeklyXP = xpGained;

      await supabase.from('sage_student_xp').insert({
        student_id: user.id,
        total_xp: newTotalXP,
        level: 1,
        xp_this_week: weeklyXP,
        week_start: weekStart,
      });
    }

    const newLevel = levelFromXP(newTotalXP);
    const leveledUp = existingXP ? newLevel > existingXP.level : false;

    // Check for new badges
    const newBadges = await checkAndAwardBadges(supabase, user.id, action, metadata);

    // Add badge XP bonus
    let bonusXP = 0;
    for (const badge of newBadges) {
      bonusXP += badge.xp_reward;
    }

    if (bonusXP > 0) {
      newTotalXP += bonusXP;
      await supabase
        .from('sage_student_xp')
        .update({
          total_xp: newTotalXP,
          level: levelFromXP(newTotalXP),
          xp_this_week: weeklyXP + bonusXP,
        })
        .eq('student_id', user.id);
    }

    return NextResponse.json({
      xp_gained: xpGained + bonusXP,
      total_xp: newTotalXP,
      level: levelFromXP(newTotalXP),
      leveled_up: leveledUp,
      new_badges: newBadges,
    });
  } catch (error) {
    console.error('[Gamification] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- Helpers ---

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

interface BadgeRow {
  id: string;
  slug: string;
  name: string;
  icon: string;
  tier: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
}

async function checkAndAwardBadges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<BadgeRow[]> {
  // Map action to requirement types that might be triggered
  const requirementTypes: string[] = [];
  if (action === 'session_completed') requirementTypes.push('sessions_completed');
  if (action === 'assessment_completed') requirementTypes.push('assessments_completed');
  if (action === 'perfect_assessment') requirementTypes.push('perfect_assessments');
  if (action === 'topic_mastered') requirementTypes.push('topics_mastered');
  if (action === 'misconception_cleared') requirementTypes.push('misconceptions_cleared');
  if (action === 'streak_day') requirementTypes.push('streak_days');
  if (action === 'study_minutes_10') requirementTypes.push('study_minutes');

  if (requirementTypes.length === 0) return [];

  // Get unearned badges for these requirement types
  const { data: candidateBadges } = await supabase
    .from('sage_badges')
    .select('*')
    .in('requirement_type', requirementTypes);

  if (!candidateBadges || candidateBadges.length === 0) return [];

  // Get already earned badge IDs
  const { data: earnedBadgeIds } = await supabase
    .from('sage_student_badges')
    .select('badge_id')
    .eq('student_id', studentId);

  const earnedSet = new Set((earnedBadgeIds || []).map(b => b.badge_id));
  const unearnedBadges = candidateBadges.filter(b => !earnedSet.has(b.id));

  if (unearnedBadges.length === 0) return [];

  // Check each badge's requirement against current count
  const newBadges: BadgeRow[] = [];
  const currentValue = (metadata?.count as number) || 0;

  for (const badge of unearnedBadges) {
    if (currentValue >= badge.requirement_value) {
      const { error } = await supabase.from('sage_student_badges').insert({
        student_id: studentId,
        badge_id: badge.id,
      });

      if (!error) {
        newBadges.push(badge);
      }
    }
  }

  return newBadges;
}
