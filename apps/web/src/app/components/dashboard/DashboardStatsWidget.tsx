/**
 * Filename: apps/web/src/app/components/dashboard/DashboardStatsWidget.tsx
 * Purpose: Aggregated stats widget for dashboard right sidebar
 * Created: 2025-11-08
 */

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './DashboardStatsWidget.module.css';

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
      <div className={styles.widget}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      </div>
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
    <div className={styles.widget}>
      {/* Urgent Section */}
      {summary.urgent.pending_reviews > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.urgentIndicator}>⚠️</span>
            Urgent
          </h3>
          <div className={styles.statCard}>
            <Link href="/reviews" className={styles.statLink}>
              <div className={styles.statValue}>
                {summary.urgent.pending_reviews}
              </div>
              <div className={styles.statLabel}>
                Pending Review{summary.urgent.pending_reviews !== 1 ? 's' : ''}
              </div>
              {summary.urgent.urgent_reviews > 0 && (
                <div className={styles.urgentBadge}>
                  {summary.urgent.urgent_reviews} due soon
                </div>
              )}
            </Link>
          </div>
        </div>
      )}

      {/* Next Session */}
      {summary.upcoming.next_booking && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Next Session</h3>
          <div className={styles.nextSessionCard}>
            <Link
              href={`/bookings`}
              className={styles.nextSessionLink}
            >
              <div className={styles.sessionName}>
                {summary.upcoming.next_booking.service_name}
              </div>
              <div className={styles.sessionDate}>
                {new Date(summary.upcoming.next_booking.session_start_time).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </Link>
          </div>
          {summary.upcoming.total_upcoming > 1 && (
            <Link href="/bookings" className={styles.viewMore}>
              +{summary.upcoming.total_upcoming - 1} more upcoming
            </Link>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Quick Stats</h3>

        <div className={styles.quickStats}>
          {/* Earnings */}
          <Link href="/financials" className={styles.quickStat}>
            <div className={styles.quickStatIcon}>💰</div>
            <div className={styles.quickStatContent}>
              <div className={styles.quickStatValue}>
                {formatCurrency(summary.financials.total_earnings, summary.financials.currency)}
              </div>
              <div className={styles.quickStatLabel}>Total Earnings</div>
            </div>
          </Link>

          {/* Rating */}
          {summary.reputation.total_reviews > 0 && (
            <Link href="/reviews" className={styles.quickStat}>
              <div className={styles.quickStatIcon}>⭐</div>
              <div className={styles.quickStatContent}>
                <div className={styles.quickStatValue}>
                  {summary.reputation.average_rating.toFixed(1)}
                </div>
                <div className={styles.quickStatLabel}>
                  Average Rating ({summary.reputation.total_reviews} reviews)
                </div>
              </div>
            </Link>
          )}

          {/* Messages */}
          {summary.messages.unread_count > 0 && (
            <Link href="/messages" className={styles.quickStat}>
              <div className={styles.quickStatIcon}>💬</div>
              <div className={styles.quickStatContent}>
                <div className={styles.quickStatValue}>
                  {summary.messages.unread_count}
                </div>
                <div className={styles.quickStatLabel}>Unread Messages</div>
              </div>
            </Link>
          )}

          {/* Upcoming Bookings */}
          {summary.upcoming.total_upcoming > 0 && (
            <Link href="/bookings" className={styles.quickStat}>
              <div className={styles.quickStatIcon}>📅</div>
              <div className={styles.quickStatContent}>
                <div className={styles.quickStatValue}>
                  {summary.upcoming.total_upcoming}
                </div>
                <div className={styles.quickStatLabel}>Upcoming Sessions</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
