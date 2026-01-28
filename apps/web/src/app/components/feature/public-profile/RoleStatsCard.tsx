/**
 * Filename: apps/web/src/app/components/public-profile/RoleStatsCard.tsx
 * Purpose: Public-facing role stats card for public profiles
 * Created: 2025-11-12
 * Updated: 2025-12-08 - Removed mock data, show only real stats from database
 *
 * Displays public-facing statistics for the profile owner's role
 * This is different from the account RoleStatsCard which shows "Your Performance"
 */
'use client';

import React from 'react';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import styles from './RoleStatsCard.module.css';

interface StatItemProps {
  label: string;
  value: string | number;
  tooltip?: string;
}

function StatItem({ label, value, tooltip }: StatItemProps) {
  return (
    <div className={styles.statItem} title={tooltip}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

interface RoleStatsCardProps {
  profile: Profile;
}

export function RoleStatsCard({ profile }: RoleStatsCardProps) {
  // Format member since date
  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  // Always show all stats - use 0 if no data available
  const stats: React.JSX.Element[] = [];

  // 1. Member Since (always show - we always have created_at)
  if (profile.created_at) {
    stats.push(
      <StatItem
        key="member-since"
        label="Member Since"
        value={formatMemberSince(profile.created_at)}
      />
    );
  }

  // 2. Sessions Completed (always show)
  stats.push(
    <StatItem
      key="sessions"
      label="Sessions Completed"
      value={profile.sessions_completed || 0}
    />
  );

  // 3. Average Rating (always show)
  if (profile.average_rating && profile.average_rating > 0) {
    stats.push(
      <StatItem
        key="rating"
        label="Average Rating"
        value={`${profile.average_rating.toFixed(1)}/5`}
        tooltip={`Based on ${profile.total_reviews || 0} reviews`}
      />
    );
  } else {
    stats.push(
      <StatItem
        key="rating"
        label="Average Rating"
        value="0/5"
        tooltip="No reviews yet"
      />
    );
  }

  // 4. Total Reviews (always show)
  stats.push(
    <StatItem
      key="reviews"
      label="Total Reviews"
      value={profile.total_reviews || 0}
    />
  );

  // 5. Reviews Given (always show)
  stats.push(
    <StatItem
      key="reviews-given"
      label="Reviews Given"
      value={profile.reviews_given || 0}
    />
  );

  // 6. Tutors/Clients Worked With (role-specific, always show)
  if (profile.active_role === 'client') {
    stats.push(
      <StatItem
        key="tutors-worked-with"
        label="Tutors Worked With"
        value={profile.tutors_worked_with || 0}
      />
    );
  }

  if (profile.active_role === 'tutor') {
    stats.push(
      <StatItem
        key="clients-worked-with"
        label="Clients Worked With"
        value={profile.clients_worked_with || 0}
      />
    );
  }

  // 7. Profile Views (always show)
  stats.push(
    <StatItem
      key="views"
      label="Profile Views"
      value={profile.profile_views || 0}
    />
  );

  return (
    <Card className={styles.roleStatsCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Profile Stats</h3>
      </div>
      <div className={styles.statsGrid}>
        {stats}
      </div>
    </Card>
  );
}
