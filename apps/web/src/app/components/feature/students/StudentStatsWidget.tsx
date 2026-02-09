/**
 * Filename: StudentStatsWidget.tsx
 * Purpose: Adaptive student portfolio statistics widget
 * Created: 2026-02-09
 *
 * Features:
 * - Works for both clients (managing children) and tutors/agents (managing students)
 * - Adaptive display: Shows names for small portfolios (1-10), percentages for large (11-50)
 * - Student-focused metrics: capacity, profile completion, preferences, engagement
 * - No booking/session stats (those belong in separate widget)
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './StudentStatsWidget.module.css';

interface StudentStat {
  totalStudents: number;
  profileComplete: number;
  profileIncomplete: number;
  preferencesSet: number;
  preferencesMissing: number;
  needsAttention: number;
  pendingInvitations: number;
  addedThisMonth: number;
}

interface StudentStatsWidgetProps {
  stats: StudentStat;
  isLoading?: boolean;
}

export default function StudentStatsWidget({ stats, isLoading }: StudentStatsWidgetProps) {
  const router = useRouter();
  const isSmallPortfolio = stats.totalStudents <= 10;

  if (isLoading) {
    return (
      <HubComplexCard>
        <h3 className={styles.title}>Student Portfolio</h3>
        <div className={styles.loading}>Loading stats...</div>
      </HubComplexCard>
    );
  }

  const profileCompletePercentage = stats.totalStudents > 0
    ? Math.round((stats.profileComplete / stats.totalStudents) * 100)
    : 0;

  const preferencesSetPercentage = stats.totalStudents > 0
    ? Math.round((stats.preferencesSet / stats.totalStudents) * 100)
    : 0;

  return (
    <HubComplexCard>
      <h3 className={styles.title}>Student Portfolio</h3>

      <div className={styles.content}>
        {/* Active Students */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>ACTIVE STUDENTS</div>
          <div className={styles.statValue}>{stats.totalStudents} students</div>
          {stats.addedThisMonth > 0 && (
            <div className={styles.statDetail}>
              +{stats.addedThisMonth} added this month
            </div>
          )}
          {!isSmallPortfolio && (
            <div className={styles.statDetail}>
              {50 - stats.totalStudents} slots available
            </div>
          )}
        </div>

        {/* Profile Status */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>PROFILE STATUS</div>
          {isSmallPortfolio ? (
            <>
              <div className={styles.statRow}>
                <span>Complete:</span>
                <span className={styles.statValue}>{stats.profileComplete} students</span>
              </div>
              <div className={styles.statRow}>
                <span>Needs setup:</span>
                <span className={styles.statValue}>{stats.profileIncomplete} students</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.statValue}>
                Complete: {stats.profileComplete} students ({profileCompletePercentage}%)
              </div>
              <div className={styles.statDetail}>
                Needs setup: {stats.profileIncomplete} students
              </div>
            </>
          )}
        </div>

        {/* Learning Preferences */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>LEARNING PREFERENCES</div>
          {isSmallPortfolio ? (
            <>
              <div className={styles.statRow}>
                <span>Set:</span>
                <span className={styles.statValue}>{stats.preferencesSet} students</span>
              </div>
              <div className={styles.statRow}>
                <span>Missing:</span>
                <span className={styles.statValue}>{stats.preferencesMissing} students</span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.statValue}>
                Set: {stats.preferencesSet} students ({preferencesSetPercentage}%)
              </div>
              <div className={styles.statDetail}>
                Missing: {stats.preferencesMissing} students
              </div>
            </>
          )}
          {stats.preferencesMissing > 0 && (
            <div className={styles.helpText}>
              Helps tutors prepare for sessions
            </div>
          )}
        </div>

        {/* Engagement Status */}
        {stats.needsAttention > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>ENGAGEMENT STATUS</div>
            <div className={styles.statValue}>
              Active learners: {stats.totalStudents - stats.needsAttention} students
            </div>
            <div className={styles.alertRow}>
              <span className={styles.alertLabel}>Need attention:</span>
              <span className={styles.alertValue}>{stats.needsAttention} students</span>
            </div>
            <div className={styles.helpText}>
              Low attendance or no recent sessions
            </div>
          </div>
        )}

        {/* Pending Actions */}
        {(stats.pendingInvitations > 0 || stats.profileIncomplete > 0) && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>PENDING ACTIONS</div>
            {stats.pendingInvitations > 0 && (
              <div className={styles.statRow}>
                <span>{stats.pendingInvitations} invitations sent</span>
              </div>
            )}
            {stats.profileIncomplete > 0 && (
              <div className={styles.statRow}>
                <span>{stats.profileIncomplete} students need profile setup</span>
              </div>
            )}
          </div>
        )}
      </div>
    </HubComplexCard>
  );
}
