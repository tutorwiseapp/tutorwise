/**
 * Filename: OrganisationStatsCard.tsx
 * Purpose: Display organisation statistics in sidebar
 * Created: 2025-12-31
 */

import { Users, Star, MessageCircle, Eye, Calendar, CheckCircle } from 'lucide-react';
import styles from './OrganisationStatsCard.module.css';

interface OrganisationStatsCardProps {
  organisation: any;
}

export function OrganisationStatsCard({ organisation }: OrganisationStatsCardProps) {
  // Format established date
  const getEstablishedYear = () => {
    if (!organisation.established_date) return null;
    return new Date(organisation.established_date).getFullYear();
  };

  const establishedYear = getEstablishedYear();

  return (
    <div className={styles.card}>
      {/* Header with light teal background */}
      <div className={styles.cardHeader}>
        <h3 className={styles.title}>Organisation Stats</h3>
      </div>

      {/* Content wrapper for padding */}
      <div className={styles.statsContainer}>
        <div className={styles.statsGrid}>
        {/* Sessions Completed - Always show */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{(organisation.total_sessions || 0).toLocaleString()}</div>
            <div className={styles.statLabel}>Sessions Completed</div>
          </div>
        </div>

        {/* Average Rating - Always show */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <Star size={20} fill="currentColor" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>
              {organisation.avg_rating > 0 ? `⭐ ${organisation.avg_rating.toFixed(1)}` : '0'}
            </div>
            <div className={styles.statLabel}>Average Rating</div>
          </div>
        </div>

        {/* Team Size - Always show */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <Users size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{organisation.total_tutors || 0}</div>
            <div className={styles.statLabel}>Expert Tutor{(organisation.total_tutors || 0) !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Total Reviews - Always show */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <MessageCircle size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{organisation.total_reviews || 0}</div>
            <div className={styles.statLabel}>Review{(organisation.total_reviews || 0) !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Profile Views - Always show */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <Eye size={20} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{(organisation.profile_views || 0).toLocaleString()}</div>
            <div className={styles.statLabel}>Profile Views</div>
          </div>
        </div>

        {/* Established Date - Show if available */}
        {establishedYear && (
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <Calendar size={20} />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>Est. {establishedYear}</div>
              <div className={styles.statLabel}>Established</div>
            </div>
          </div>
        )}
        </div>

        {/* Subjects Offered Section */}
        {organisation.unique_subjects && organisation.unique_subjects.length > 0 && (
          <div className={styles.subjectsSection}>
            <h4 className={styles.subjectsTitle}>Subjects Offered</h4>
            <div className={styles.subjectsList}>
              {organisation.unique_subjects.map((subject: string) => (
                <span key={subject} className={styles.subjectTag}>
                  {subject}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Levels Offered Section */}
        {organisation.unique_levels && organisation.unique_levels.length > 0 && (
          <div className={styles.levelsSection}>
            <h4 className={styles.levelsTitle}>Levels Offered</h4>
            <div className={styles.levelsList}>
              {organisation.unique_levels.map((level: string) => (
                <span key={level} className={styles.levelTag}>
                  {level}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Total Clients Served */}
        {organisation.total_clients > 0 && (
          <div className={styles.clientsServed}>
            <div className={styles.clientsIcon}>👥</div>
            <div>
              <div className={styles.clientsValue}>{organisation.total_clients}+ Clients</div>
              <div className={styles.clientsLabel}>Successfully Served</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
