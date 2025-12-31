/**
 * Filename: ReferralAchievements.tsx
 * Purpose: Display member achievements, badges, and streaks
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Award, TrendingUp, Trophy, Star, Flame } from 'lucide-react';
import styles from './ReferralAchievements.module.css';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  requirement_type: string;
  requirement_value: number;
  points: number;
  earned_at?: string;
  is_earned: boolean;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_referral_date: string;
}

interface ReferralAchievementsProps {
  memberId: string;
  organisationId: string;
}

export function ReferralAchievements({
  memberId,
  organisationId,
}: ReferralAchievementsProps) {
  const supabase = createClient();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  useEffect(() => {
    loadAchievements();
    loadStreak();
  }, [memberId, organisationId]);

  const loadAchievements = async () => {
    try {
      // Get all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('referral_achievements')
        .select('*')
        .eq('is_active', true)
        .order('tier', { ascending: true })
        .order('requirement_value', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Get member's earned achievements
      const { data: earnedAchievements, error: earnedError } = await supabase
        .from('member_achievements')
        .select('achievement_id, earned_at')
        .eq('member_id', memberId)
        .eq('organisation_id', organisationId);

      if (earnedError) throw earnedError;

      // Merge data
      const earnedIds = new Set(earnedAchievements?.map((a) => a.achievement_id) || []);
      const earnedMap = new Map(
        earnedAchievements?.map((a) => [a.achievement_id, a.earned_at]) || []
      );

      const merged = (allAchievements || []).map((achievement) => ({
        ...achievement,
        is_earned: earnedIds.has(achievement.id),
        earned_at: earnedMap.get(achievement.id),
      }));

      setAchievements(merged);

      // Calculate total points
      const points = merged
        .filter((a) => a.is_earned)
        .reduce((sum, a) => sum + a.points, 0);
      setTotalPoints(points);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStreak = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_streaks')
        .select('*')
        .eq('member_id', memberId)
        .eq('organisation_id', organisationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setStreak(data);
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
      diamond: '#b9f2ff',
    };
    return colors[tier] || '#94a3b8';
  };

  const getTierGradient = (tier: string) => {
    const gradients: Record<string, string> = {
      bronze: 'linear-gradient(135deg, #cd7f32 0%, #8b5a2b 100%)',
      silver: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)',
      gold: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
      platinum: 'linear-gradient(135deg, #e5e4e2 0%, #a8a9ad 100%)',
      diamond: 'linear-gradient(135deg, #b9f2ff 0%, #4fc3f7 100%)',
    };
    return gradients[tier] || 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredAchievements = achievements.filter((achievement) => {
    if (filter === 'earned') return achievement.is_earned;
    if (filter === 'locked') return !achievement.is_earned;
    return true;
  });

  const earnedCount = achievements.filter((a) => a.is_earned).length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loading}>Loading achievements...</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Achievements & Badges</h2>
          <p className={styles.subtitle}>
            Earn badges and points by hitting referral milestones
          </p>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <Trophy size={24} className={styles.statIcon} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>
                {earnedCount}/{totalCount}
              </div>
              <div className={styles.statLabel}>Achievements</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <Star size={24} className={styles.statIcon} />
            <div className={styles.statContent}>
              <div className={styles.statValue}>{totalPoints}</div>
              <div className={styles.statLabel}>Total Points</div>
            </div>
          </div>

          {streak && (
            <div className={styles.statCard}>
              <Flame size={24} className={styles.statIcon} style={{ color: '#f59e0b' }} />
              <div className={styles.statContent}>
                <div className={styles.statValue}>{streak.current_streak} days</div>
                <div className={styles.statLabel}>Current Streak</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Streak Card */}
      {streak && streak.current_streak > 0 && (
        <div className={styles.streakCard}>
          <div className={styles.streakHeader}>
            <Flame size={32} className={styles.streakFlame} />
            <div>
              <div className={styles.streakTitle}>
                {streak.current_streak} Day Streak!
              </div>
              <div className={styles.streakSubtitle}>
                Keep it going! Longest streak: {streak.longest_streak} days
              </div>
            </div>
          </div>
          <div className={styles.streakProgress}>
            <div
              className={styles.streakProgressFill}
              style={{
                width: `${Math.min((streak.current_streak / streak.longest_streak) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({totalCount})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'earned' ? styles.active : ''}`}
          onClick={() => setFilter('earned')}
        >
          Earned ({earnedCount})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'locked' ? styles.active : ''}`}
          onClick={() => setFilter('locked')}
        >
          Locked ({totalCount - earnedCount})
        </button>
      </div>

      {/* Achievements Grid */}
      <div className={styles.achievementsGrid}>
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`${styles.achievementCard} ${
              achievement.is_earned ? styles.earned : styles.locked
            }`}
          >
            {/* Badge */}
            <div
              className={styles.badge}
              style={{
                background: achievement.is_earned
                  ? getTierGradient(achievement.tier)
                  : '#e2e8f0',
              }}
            >
              <span className={styles.badgeIcon}>
                {achievement.is_earned ? achievement.icon : '🔒'}
              </span>
            </div>

            {/* Content */}
            <div className={styles.achievementContent}>
              <div className={styles.achievementName}>{achievement.name}</div>
              <div className={styles.achievementDescription}>{achievement.description}</div>

              {/* Tier & Points */}
              <div className={styles.achievementMeta}>
                <span
                  className={styles.tier}
                  style={{
                    color: achievement.is_earned ? getTierColor(achievement.tier) : '#94a3b8',
                  }}
                >
                  {achievement.tier.toUpperCase()}
                </span>
                <span className={styles.points}>+{achievement.points} pts</span>
              </div>

              {/* Earned Date */}
              {achievement.is_earned && achievement.earned_at && (
                <div className={styles.earnedDate}>
                  Earned {formatDate(achievement.earned_at)}
                </div>
              )}

              {/* Progress (for locked achievements) */}
              {!achievement.is_earned && (
                <div className={styles.requirement}>
                  Requirement: {achievement.requirement_value}{' '}
                  {achievement.requirement_type.replace('_', ' ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className={styles.empty}>
          <Award size={48} />
          <p>No achievements in this category yet</p>
        </div>
      )}
    </div>
  );
}
