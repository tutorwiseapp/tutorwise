/**
 * Filename: OrganisationStatsCard.tsx
 * Purpose: Display organisation statistics in sidebar
 * Created: 2025-12-31
 */

import styles from './OrganisationStatsCard.module.css';

interface OrganisationStatsCardProps {
  organisation: any;
}

interface StatItemProps {
  label: string;
  value: string | number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

export function OrganisationStatsCard({ organisation }: OrganisationStatsCardProps) {
  // Format established date
  const formatEstablishedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  return (
    <div className={styles.card}>
      {/* Header with light teal background */}
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>Organisation Stats</h3>
      </div>

      {/* Content wrapper for padding */}
      <div className={styles.statsContainer}>
        <div className={styles.statsGrid}>
          {/* Established Date - Show if available */}
          {organisation.established_date && (
            <StatItem
              label="Established"
              value={formatEstablishedDate(organisation.established_date)}
            />
          )}

          {/* Sessions Completed - Always show */}
          <StatItem
            label="Sessions Completed"
            value={(organisation.total_sessions || 0).toLocaleString()}
          />

          {/* Average Rating - Always show */}
          <StatItem
            label="Average Rating"
            value={organisation.avg_rating > 0 ? `${organisation.avg_rating.toFixed(1)}/5` : '0/5'}
          />

          {/* Total Reviews - Always show */}
          <StatItem
            label="Total Reviews"
            value={organisation.total_reviews || 0}
          />

          {/* Team Size - Always show */}
          <StatItem
            label="Expert Tutors"
            value={organisation.total_tutors || 0}
          />

          {/* Total Clients */}
          {organisation.total_clients > 0 && (
            <StatItem
              label="Clients Worked With"
              value={organisation.total_clients}
            />
          )}

          {/* Profile Views - Always show */}
          <StatItem
            label="Profile Views"
            value={(organisation.profile_views || 0).toLocaleString()}
          />
        </div>
      </div>
    </div>
  );
}
