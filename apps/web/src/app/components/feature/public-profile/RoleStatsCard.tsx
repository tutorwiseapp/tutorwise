/**
 * Filename: apps/web/src/app/components/public-profile/RoleStatsCard.tsx
 * Purpose: Public-facing role stats card for public profiles
 * Created: 2025-11-12
 *
 * Displays public-facing statistics for the profile owner's role
 * This is different from the account RoleStatsCard which shows "Your Performance"
 */
'use client';

import React from 'react';
import { Star, Calendar, Users, CheckCircle } from 'lucide-react';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import styles from './RoleStatsCard.module.css';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className={styles.statItem}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statContent}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
      </div>
    </div>
  );
}

interface RoleStatsCardProps {
  profile: Profile;
}

export function RoleStatsCard({ profile }: RoleStatsCardProps) {
  const role = profile.active_role;

  // TODO: Replace with actual API calls to fetch real statistics
  const renderTutorStats = () => (
    <>
      <StatItem
        icon={<Star size={20} />}
        label="Average Rating"
        value="4.8"
      />
      <StatItem
        icon={<CheckCircle size={20} />}
        label="Sessions Completed"
        value="42"
      />
      <StatItem
        icon={<Calendar size={20} />}
        label="Response Time"
        value="< 2 hours"
      />
      <StatItem
        icon={<Users size={20} />}
        label="Active Students"
        value="12"
      />
    </>
  );

  const renderAgentStats = () => (
    <>
      <StatItem
        icon={<Star size={20} />}
        label="Average Rating"
        value="4.9"
      />
      <StatItem
        icon={<Users size={20} />}
        label="Tutors Represented"
        value="8"
      />
      <StatItem
        icon={<CheckCircle size={20} />}
        label="Successful Placements"
        value="24"
      />
      <StatItem
        icon={<Calendar size={20} />}
        label="Response Time"
        value="< 3 hours"
      />
    </>
  );

  const renderClientStats = () => (
    <>
      <StatItem
        icon={<Calendar size={20} />}
        label="Member Since"
        value="Jan 2024"
      />
      <StatItem
        icon={<CheckCircle size={20} />}
        label="Sessions Completed"
        value="15"
      />
      <StatItem
        icon={<Star size={20} />}
        label="Reviews Given"
        value="12"
      />
      <StatItem
        icon={<Users size={20} />}
        label="Tutors Worked With"
        value="3"
      />
    </>
  );

  const renderStats = () => {
    switch (role) {
      case 'tutor':
        return renderTutorStats();
      case 'agent':
        return renderAgentStats();
      case 'client':
        return renderClientStats();
      default:
        return null;
    }
  };

  const stats = renderStats();

  // Don't render if no stats available
  if (!stats) {
    return null;
  }

  return (
    <Card>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Profile Stats</h3>
      </div>
      <div className={styles.statsGrid}>
        {stats}
      </div>
    </Card>
  );
}
