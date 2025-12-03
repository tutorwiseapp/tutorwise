/*
 * Filename: TutorCredibleStats.tsx
 * Purpose: Displays tutor credibility metrics (sessions, reviews, response time)
 */

'use client';

import Card from '@/app/components/ui/data-display/Card';
import styles from './TutorCredibleStats.module.css';

interface TutorCredibleStatsProps {
  tutorStats: {
    sessionsTaught: number;
    totalReviews: number;
    averageRating: number;
    responseTimeHours: number;
    responseRate: number;
  };
}

export default function TutorCredibleStats({ tutorStats }: TutorCredibleStatsProps) {
  const stats = [
    {
      icon: '📚',
      value: tutorStats.sessionsTaught || 0,
      label: 'Sessions Taught',
    },
    {
      icon: '⭐',
      value: tutorStats.totalReviews || 0,
      label: 'Reviews',
    },
    {
      icon: '⏱️',
      value: `${tutorStats.responseTimeHours || 24}h`,
      label: 'Response Time',
    },
    {
      icon: '✉️',
      value: `${tutorStats.responseRate || 95}%`,
      label: 'Response Rate',
    },
  ];

  return (
    <Card className={styles.card}>
      <h4 className={styles.title}>Tutor Stats</h4>
      <div className={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <div key={idx} className={styles.statItem}>
            <span className={styles.icon}>{stat.icon}</span>
            <div className={styles.statContent}>
              <span className={styles.value}>{stat.value}</span>
              <span className={styles.label}>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
