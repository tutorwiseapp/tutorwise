/**
 * Filename: apps/web/src/app/components/account/RoleStatsCard.tsx
 * Purpose: Role-specific stats card for Account Hub (v4.7)
 * Created: 2025-11-09
 *
 * Displays role-specific metrics:
 * - Tutor: Average Rating, Active Listings, Total Bookings, Total Earned
 * - Agent: Average Rating, Tutors Managed, Conversion Rate, Commission Earned
 * - Client: Active Requests, Active Bookings, Sessions This Month, Total Spent
 */
'use client';

import React from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { Star, TrendingUp, Calendar, DollarSign, Users, Target, CheckCircle } from 'lucide-react';
import styles from './RoleStatsCard.module.css';

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

function StatItem({ icon, label, value, trend }: StatItemProps) {
  return (
    <div className={styles.statItem}>
      <div className={styles.statIcon}>{icon}</div>
      <div className={styles.statContent}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>
          {value}
          {trend && (
            <span className={`${styles.trendIndicator} ${styles[`trend${trend.charAt(0).toUpperCase() + trend.slice(1)}`]}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function RoleStatsCard() {
  const { profile } = useUserProfile();

  if (!profile) {
    return null;
  }

  const role = profile.active_role;

  // TODO: Replace with actual API calls
  const renderTutorStats = () => (
    <>
      <StatItem
        icon={<Star size={20} />}
        label="Average Rating"
        value="4.8"
      />
      <StatItem
        icon={<CheckCircle size={20} />}
        label="Active Listings"
        value="3"
        trend="up"
      />
      <StatItem
        icon={<Calendar size={20} />}
        label="Total Bookings"
        value="42"
      />
      <StatItem
        icon={<DollarSign size={20} />}
        label="Total Earned"
        value="£1,250"
        trend="up"
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
        label="Tutors Managed"
        value="8"
        trend="up"
      />
      <StatItem
        icon={<Target size={20} />}
        label="Conversion Rate"
        value="68%"
        trend="up"
      />
      <StatItem
        icon={<DollarSign size={20} />}
        label="Commission Earned"
        value="£850"
      />
    </>
  );

  const renderClientStats = () => (
    <>
      <StatItem
        icon={<CheckCircle size={20} />}
        label="Active Requests"
        value="2"
      />
      <StatItem
        icon={<Calendar size={20} />}
        label="Active Bookings"
        value="3"
        trend="up"
      />
      <StatItem
        icon={<TrendingUp size={20} />}
        label="Sessions This Month"
        value="12"
      />
      <StatItem
        icon={<DollarSign size={20} />}
        label="Total Spent"
        value="£480"
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
        return (
          <div className={styles.noStats}>
            <p>No stats available for your role.</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.statsCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Your Performance</h3>
        <span className={styles.roleIndicator}>
          {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'}
        </span>
      </div>
      <div className={styles.statsGrid}>
        {renderStats()}
      </div>
    </div>
  );
}
