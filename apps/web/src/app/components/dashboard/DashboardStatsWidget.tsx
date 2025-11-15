/**
 * Filename: apps/web/src/app/components/dashboard/DashboardStatsWidget.tsx
 * Purpose: Aggregated stats widget for dashboard right sidebar
 * Created: 2025-11-08
 * Updated: 2025-11-15 - Added CaaS Guidance Widget for tutors
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
import { CaaSGuidanceWidget } from '@/app/components/caas/CaaSGuidanceWidget';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import styles from '@/app/components/layout/sidebars/ContextualSidebar.module.css';

interface DashboardSummary {
  urgent: {
    pending_reviews: number;
    urgent_reviews: number;
  };
  upcoming: {
    next_booking: {
      id: string;
      service_name: string;
      session_start_time: string;
    } | null;
    total_upcoming: number;
  };
  financials: {
    total_earnings: number;
    currency: string;
  };
  reputation: {
    average_rating: number;
    total_reviews: number;
  };
  messages: {
    unread_count: number;
  };
}

export default function DashboardStatsWidget() {
  const { profile, activeRole } = useUserProfile();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/dashboard/summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('[DashboardStatsWidget] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SidebarWidget title="Quick Stats">
        <div className={styles.statsCard}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Loading...</span>
          </div>
        </div>
      </SidebarWidget>
    );
  }

  if (!summary) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <>
      {/* CaaS Guidance Widget - Only for tutors */}
      {profile && activeRole === 'tutor' && (
        <CaaSGuidanceWidget
          profileId={profile.id}
          profile={{
            bio_video_url: profile.bio_video_url,
            dbs_verified: profile.dbs_verified,
            qualifications: profile.qualifications,
            identity_verified: profile.identity_verified,
          }}
        />
      )}

      {/* Quick Stats Widget */}
      <SidebarWidget title="Quick Stats">
        <div className={styles.statsCard}>
          {/* Upcoming Sessions */}
          {summary.upcoming.total_upcoming > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Upcoming Sessions:</span>
              <span className={styles.statValue}>{summary.upcoming.total_upcoming}</span>
            </div>
          )}

          {/* Pending Reviews */}
          {summary.urgent.pending_reviews > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Pending Reviews:</span>
              <span className={styles.statValue}>{summary.urgent.pending_reviews}</span>
            </div>
          )}

          {/* Rating */}
          {summary.reputation.total_reviews > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Average Rating:</span>
              <span className={styles.statValue}>
                ⭐ {summary.reputation.average_rating.toFixed(1)} ({summary.reputation.total_reviews})
              </span>
            </div>
          )}

          {/* Unread Messages */}
          {summary.messages.unread_count > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Unread Messages:</span>
              <span className={styles.statValue}>{summary.messages.unread_count}</span>
            </div>
          )}

          {/* Total Earnings - Highlighted */}
          <div className={`${styles.statRow} ${styles.statHighlight}`}>
            <span className={styles.statLabel}>Total Earnings:</span>
            <span className={styles.statValueHighlight}>
              {formatCurrency(summary.financials.total_earnings, summary.financials.currency)}
            </span>
          </div>
        </div>
      </SidebarWidget>
    </>
  );
}
