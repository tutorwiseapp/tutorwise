/**
 * Filename: ReferralAchievements.tsx
 * Purpose: Gamification widget showing achievements, streaks, and leaderboard
 * Created: 2025-12-07
 * Phase 3: Gamification Elements
 */

'use client';

import React, { useMemo } from 'react';
import { Trophy, Flame, TrendingUp } from 'lucide-react';
import styles from './ReferralAchievements.module.css';

interface Achievement {
  milestone: number;
  label: string;
  unlocked: boolean;
  progress?: number;
}

interface ReferralAchievementsProps {
  totalReferrals: number;
  currentStreak?: number;
  leaderboardPosition?: number;
}

export default function ReferralAchievements({
  totalReferrals,
  currentStreak = 0,
  leaderboardPosition,
}: ReferralAchievementsProps) {
  // Define achievement milestones
  const achievements = useMemo<Achievement[]>(() => {
    const milestones = [
      { milestone: 10, label: '10 Referrals' },
      { milestone: 50, label: '50 Referrals' },
      { milestone: 100, label: '100 Referrals' },
    ];

    return milestones.map((m) => {
      if (totalReferrals >= m.milestone) {
        return { ...m, unlocked: true };
      } else {
        return {
          ...m,
          unlocked: false,
          progress: Math.min((totalReferrals / m.milestone) * 100, 99),
        };
      }
    });
  }, [totalReferrals]);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <Trophy className={styles.icon} size={20} />
        <h3 className={styles.title}>Your Achievements</h3>
      </div>

      <div className={styles.content}>
        {/* Achievement Milestones */}
        <div className={styles.achievementsList}>
          {achievements.map((achievement) => (
            <div
              key={achievement.milestone}
              className={`${styles.achievementItem} ${
                achievement.unlocked ? styles.unlocked : styles.locked
              }`}
            >
              <div className={styles.achievementIcon}>
                {achievement.unlocked ? '✓' : '🔒'}
              </div>
              <div className={styles.achievementInfo}>
                <span className={styles.achievementLabel}>
                  {achievement.label}
                </span>
                {!achievement.unlocked && achievement.progress !== undefined && (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                    <span className={styles.progressText}>
                      {totalReferrals}/{achievement.milestone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Streak Counter */}
        {currentStreak > 0 && (
          <div className={styles.streakSection}>
            <div className={styles.streakHeader}>
              <Flame className={styles.streakIcon} size={18} />
              <span className={styles.streakText}>
                {currentStreak}-day streak!
              </span>
            </div>
            <p className={styles.streakDescription}>
              Keep referring to maintain your streak
            </p>
          </div>
        )}

        {/* Leaderboard Position */}
        {leaderboardPosition !== undefined && (
          <div className={styles.leaderboardSection}>
            <div className={styles.leaderboardHeader}>
              <TrendingUp className={styles.leaderboardIcon} size={18} />
              <span className={styles.leaderboardText}>
                Leaderboard: #{leaderboardPosition} this month
              </span>
            </div>
            <p className={styles.leaderboardDescription}>
              {leaderboardPosition <= 10
                ? 'Amazing! You\'re in the top 10!'
                : leaderboardPosition <= 50
                ? 'Great work! Keep climbing!'
                : 'Keep referring to rise up the ranks!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
