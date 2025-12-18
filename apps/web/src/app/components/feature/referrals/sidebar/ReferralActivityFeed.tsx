/**
 * Filename: apps/web/src/app/components/feature/referrals/ReferralActivityFeed.tsx
 * Purpose: Display recent referral activity timeline
 * Created: 2025-12-07
 */

'use client';

import React, { useMemo } from 'react';
import styles from './ReferralActivityFeed.module.css';

interface ActivityItem {
  id: string;
  type: 'converted' | 'signed_up' | 'referred';
  referredUserName: string;
  commission?: number;
  timestamp: Date;
}

interface ReferralActivityFeedProps {
  referrals: any[];
}

export default function ReferralActivityFeed({ referrals }: ReferralActivityFeedProps) {
  const activities = useMemo(() => {
    if (!referrals || referrals.length === 0) return [];

    const items: ActivityItem[] = [];

    referrals.forEach((ref: any) => {
      const userName = ref.referred_user?.full_name || 'Anonymous';
      const commission = ref.first_commission?.amount || 0;

      if (ref.status === 'Converted') {
        items.push({
          id: `${ref.id}-converted`,
          type: 'converted',
          referredUserName: userName,
          commission,
          timestamp: new Date(ref.updated_at || ref.created_at),
        });
      } else if (ref.status === 'Signed Up') {
        items.push({
          id: `${ref.id}-signed_up`,
          type: 'signed_up',
          referredUserName: userName,
          timestamp: new Date(ref.updated_at || ref.created_at),
        });
      } else if (ref.status === 'Referred') {
        items.push({
          id: `${ref.id}-referred`,
          type: 'referred',
          referredUserName: userName,
          timestamp: new Date(ref.created_at),
        });
      }
    });

    // Sort by most recent first
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit to 10 most recent activities
    return items.slice(0, 10);
  }, [referrals]);

  const getRelativeTime = (timestamp: Date): string => {
    const now = Date.now();
    const diff = now - timestamp.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) !== 1 ? 's' : ''} ago`;
  };

  const renderActivity = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'converted':
        return (
          <div key={activity.id} className={styles.activityItem}>
            <div className={styles.activityContent}>
              <div className={styles.activityTitle}>
                <span className={styles.activityName}>{activity.referredUserName}</span>
                <span className={styles.activityAction}> converted!</span>
              </div>
              <div className={styles.activityMeta}>
                <span className={styles.commission}>+£{activity.commission?.toFixed(2)}</span>
                <span className={styles.separator}>·</span>
                <span className={styles.timestamp}>{getRelativeTime(activity.timestamp)}</span>
              </div>
            </div>
          </div>
        );

      case 'signed_up':
        return (
          <div key={activity.id} className={styles.activityItem}>
            <div className={styles.activityContent}>
              <div className={styles.activityTitle}>
                <span className={styles.activityName}>{activity.referredUserName}</span>
                <span className={styles.activityAction}> signed up</span>
              </div>
              <div className={styles.activityMeta}>
                <span className={styles.timestamp}>{getRelativeTime(activity.timestamp)}</span>
              </div>
            </div>
          </div>
        );

      case 'referred':
        return (
          <div key={activity.id} className={styles.activityItem}>
            <div className={styles.activityContent}>
              <div className={styles.activityTitle}>
                <span className={styles.activityAction}>New referral: </span>
                <span className={styles.activityName}>{activity.referredUserName}</span>
              </div>
              <div className={styles.activityMeta}>
                <span className={styles.timestamp}>{getRelativeTime(activity.timestamp)}</span>
              </div>
            </div>
          </div>
        );
    }
  };

  if (activities.length === 0) {
    return (
      <div className={styles.feedWidget}>
        <h3 className={styles.title}>Recent Activity</h3>
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.feedWidget}>
      <h3 className={styles.title}>Recent Activity</h3>
      <div className={styles.activitiesContainer}>
        {activities.map((activity) => renderActivity(activity))}
      </div>
    </div>
  );
}
