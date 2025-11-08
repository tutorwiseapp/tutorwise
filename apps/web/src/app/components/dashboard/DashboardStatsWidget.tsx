/**
 * Filename: apps/web/src/app/components/dashboard/DashboardStatsWidget.tsx
 * Purpose: Aggregated stats widget for dashboard right sidebar
 * Created: 2025-11-08
 * Updated: 2025-11-08 - Refactored to use standard SidebarWidget styling
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SidebarWidget } from '@/app/components/layout/sidebars/ContextualSidebar';
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
      {/* Urgent Reviews Widget */}
      {summary.urgent.pending_reviews > 0 && (
        <SidebarWidget title="⚠️ Urgent">
          <div className={styles.statsCard}>
            <div className={styles.statRow}>
              <Link href="/reviews" className={styles.statLink}>
                <span className={styles.statLabel}>Pending Reviews:</span>
                <span className={styles.statValue}>{summary.urgent.pending_reviews}</span>
              </Link>
            </div>
            {summary.urgent.urgent_reviews > 0 && (
              <div className={styles.statRow}>
                <span className={styles.statLabel} style={{ color: 'var(--status-error)' }}>
                  Due soon:
                </span>
                <span className={styles.statValue} style={{ color: 'var(--status-error)' }}>
                  {summary.urgent.urgent_reviews}
                </span>
              </div>
            )}
          </div>
        </SidebarWidget>
      )}

      {/* Next Session Widget */}
      {summary.upcoming.next_booking && (
        <SidebarWidget title="Next Session">
          <div className={styles.statsCard}>
            <Link href="/bookings" className={styles.statLink}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>
                  {summary.upcoming.next_booking.service_name}
                </span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statValue}>
                  {new Date(summary.upcoming.next_booking.session_start_time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </Link>
            {summary.upcoming.total_upcoming > 1 && (
              <div className={styles.statRow}>
                <Link href="/bookings" className={styles.statLink}>
                  <span className={styles.statLabel}>
                    +{summary.upcoming.total_upcoming - 1} more upcoming
                  </span>
                </Link>
              </div>
            )}
          </div>
        </SidebarWidget>
      )}

      {/* Quick Stats Widget */}
      <SidebarWidget title="Quick Stats">
        <div className={styles.statsCard}>
          {/* Earnings */}
          <div className={styles.statRow}>
            <Link href="/financials" className={styles.statLink}>
              <span className={styles.statLabel}>Total Earnings:</span>
              <span className={styles.statValue}>
                {formatCurrency(summary.financials.total_earnings, summary.financials.currency)}
              </span>
            </Link>
          </div>

          {/* Rating */}
          {summary.reputation.total_reviews > 0 && (
            <div className={styles.statRow}>
              <Link href="/reviews" className={styles.statLink}>
                <span className={styles.statLabel}>Average Rating:</span>
                <span className={styles.statValue}>
                  ⭐ {summary.reputation.average_rating.toFixed(1)} ({summary.reputation.total_reviews})
                </span>
              </Link>
            </div>
          )}

          {/* Upcoming Sessions */}
          {summary.upcoming.total_upcoming > 0 && (
            <div className={styles.statRow}>
              <Link href="/bookings" className={styles.statLink}>
                <span className={styles.statLabel}>Upcoming Sessions:</span>
                <span className={styles.statValue}>{summary.upcoming.total_upcoming}</span>
              </Link>
            </div>
          )}

          {/* Unread Messages */}
          {summary.messages.unread_count > 0 && (
            <div className={styles.statRow}>
              <Link href="/messages" className={styles.statLink}>
                <span className={styles.statLabel}>Unread Messages:</span>
                <span className={styles.statValue}>{summary.messages.unread_count}</span>
              </Link>
            </div>
          )}
        </div>
      </SidebarWidget>
    </>
  );
}
