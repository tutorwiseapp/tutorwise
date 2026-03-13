/**
 * Filename: PerformanceInsights.tsx
 * Purpose: Performance insights widget showing conversion rate, weekly activity, and leaderboard
 * Created: 2025-12-07
 * Phase 3: Performance Dashboard & Gamification
 */

'use client';

import React, { useMemo } from 'react';
import { BarChart3, Lightbulb } from 'lucide-react';
import styles from './PerformanceInsights.module.css';

interface PerformanceInsightsProps {
  referrals: any[];
  // Mock data for now - will be replaced with API calls
  platformAverageConversion?: number;
  weeklyLeaderboard?: {
    topPerformer: { firstName: string; count: number };
    totalActive: number;
  };
}

export default function PerformanceInsights({
  referrals,
  platformAverageConversion = 35, // Mock: 35% platform average
  weeklyLeaderboard = {
    topPerformer: { firstName: '', count: 0 },
    totalActive: 0,
  },
}: PerformanceInsightsProps) {
  // Calculate conversion rate (Converted / Total Referrals)
  const conversionRate = useMemo(() => {
    if (referrals.length === 0) return 0;
    const converted = referrals.filter((r: any) => r.status === 'Converted').length;
    return (converted / referrals.length) * 100;
  }, [referrals]);

  // Calculate this week's referrals
  const weeklyReferrals = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    return referrals.filter((r: any) => {
      const refDate = new Date(r.created_at);
      return refDate >= weekStart;
    }).length;
  }, [referrals]);

  // Calculate user's weekly rank (mock for now)
  const weeklyRank = useMemo(() => {
    // Mock logic: If you have 0 refs, you're last. Otherwise, calculate based on activity
    if (weeklyReferrals === 0) return weeklyLeaderboard.totalActive;

    // Simple mock: Higher referrals = better rank
    const maxRank = weeklyLeaderboard.totalActive;
    const topCount = weeklyLeaderboard.topPerformer.count;

    if (weeklyReferrals >= topCount) return 1;

    // Linear interpolation between 1 and maxRank
    const rankEstimate = Math.ceil(
      1 + ((topCount - weeklyReferrals) / topCount) * (maxRank - 1)
    );

    return Math.min(rankEstimate, maxRank);
  }, [weeklyReferrals, weeklyLeaderboard]);

  // Calculate comparison to average
  const vsAverage = conversionRate - platformAverageConversion;
  const vsAveragePercent = platformAverageConversion > 0
    ? ((vsAverage / platformAverageConversion) * 100)
    : 0;

  // Generate personalized insight
  const insight = useMemo(() => {
    const hasReferrals = referrals.length > 0;
    const hasWeeklyActivity = weeklyReferrals > 0;
    const highConversion = conversionRate >= platformAverageConversion;
    const topRank = weeklyRank <= 10;

    if (!hasReferrals) {
      return "Start referring to see your performance insights and compete on the leaderboard!";
    }

    if (highConversion && topRank) {
      return "Excellent work! Your conversion rate is above average and you're in the top 10 this week.";
    }

    if (highConversion && !hasWeeklyActivity) {
      return "Your conversion rate is excellent! Increase your referral volume this week to climb the leaderboard.";
    }

    if (!highConversion && hasWeeklyActivity) {
      return "You're active this week! Focus on following up with referrals to improve your conversion rate.";
    }

    if (highConversion) {
      return "Great conversion rate! Keep referring to move up the leaderboard.";
    }

    if (topRank) {
      return "You're in the top 10! Focus on quality referrals to improve your conversion rate.";
    }

    return "Keep referring and following up with contacts to improve your performance!";
  }, [referrals.length, weeklyReferrals, conversionRate, platformAverageConversion, weeklyRank]);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <BarChart3 className={styles.icon} size={20} />
        <h3 className={styles.title}>Performance Insights</h3>
      </div>

      <div className={styles.content}>
        {/* Conversion Rate Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Conversion Rate</span>
            {referrals.length > 0 && (
              <span className={`${styles.badge} ${vsAverage >= 0 ? styles.badgeGreen : styles.badgeRed}`}>
                {vsAverage >= 0 ? '↑' : '↓'} {Math.abs(vsAveragePercent).toFixed(0)}% vs avg
              </span>
            )}
          </div>

          {referrals.length > 0 ? (
            <>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.min(conversionRate, 100)}%` }}
                />
              </div>
              <div className={styles.conversionStats}>
                <span className={styles.conversionValue}>{conversionRate.toFixed(0)}%</span>
                <span className={styles.conversionLabel}>
                  {referrals.filter((r: any) => r.status === 'Converted').length} of {referrals.length} converted
                </span>
              </div>
            </>
          ) : (
            <p className={styles.emptyText}>No referrals yet</p>
          )}
        </div>

        {/* Weekly Activity Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>This Week&apos;s Activity</span>
          </div>

          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>You</span>
              <span className={styles.activityValue}>
                {weeklyReferrals} {weeklyReferrals === 1 ? 'referral' : 'referrals'}
              </span>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Top performer</span>
              <span className={styles.activityValue}>
                {weeklyLeaderboard.topPerformer.firstName && weeklyLeaderboard.topPerformer.count > 0
                  ? `${weeklyLeaderboard.topPerformer.firstName}, ${weeklyLeaderboard.topPerformer.count} ${weeklyLeaderboard.topPerformer.count === 1 ? 'referral' : 'referrals'}`
                  : '- / 0 referrals'}
              </span>
            </div>
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Your rank</span>
              <span className={`${styles.activityValue} ${weeklyRank <= 10 ? styles.topRank : ''}`}>
                #{weeklyRank} of {weeklyLeaderboard.totalActive}
              </span>
            </div>
          </div>
        </div>

        {/* Insight Section */}
        <div className={styles.insightSection}>
          <div className={styles.insightHeader}>
            <Lightbulb className={styles.insightIcon} size={16} />
            <span className={styles.insightTitle}>Insight</span>
          </div>
          <p className={styles.insightText}>{insight}</p>
        </div>
      </div>
    </div>
  );
}
