/**
 * Filename: AboutCard.tsx
 * Purpose: About section displaying profile bio/description
 * Created: 2025-11-12
 * Updated: 2025-12-08 - Removed client-side fetch, use prop from server (performance optimization)
 * Updated: 2025-11-16 - Added Community Tutor badge and free sessions stat (v5.9)
 */

import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import { Heart } from 'lucide-react';
import styles from './AboutCard.module.css';

interface AboutCardProps {
  profile: Profile;
}

export function AboutCard({ profile }: AboutCardProps) {
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  // Use free_sessions_count from server-side fetch (passed via profile prop)
  const freeSessionsCount = profile.free_sessions_count || 0;

  // Determine if tutor is a "Community Tutor" (has given at least 1 free session)
  const isCommunityTutor = freeSessionsCount > 0;

  // If no bio, show empty state
  if (!profile.bio) {
    return (
      <Card className={styles.aboutCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>About</h2>
          {isCommunityTutor && (
            <div className={styles.communityBadge}>
              <Heart size={14} />
              Community Tutor
            </div>
          )}
        </div>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {firstName} hasn&apos;t added their description yet.
          </p>
        </div>
        {isCommunityTutor && (
          <div className={styles.freeSessionsStat}>
            <Heart size={16} className={styles.statIcon} />
            <span className={styles.statText}>
              {freeSessionsCount} free {freeSessionsCount === 1 ? 'session' : 'sessions'} given to the community
            </span>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={styles.aboutCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>About</h2>
        {isCommunityTutor && (
          <div className={styles.communityBadge}>
            <Heart size={14} />
            Community Tutor
          </div>
        )}
      </div>
      <div className={styles.bioContent}>
        <p className={styles.bioText}>{profile.bio}</p>
      </div>
      {isCommunityTutor && (
        <div className={styles.freeSessionsStat}>
          <Heart size={16} className={styles.statIcon} />
          <span className={styles.statText}>
            {freeSessionsCount} free {freeSessionsCount === 1 ? 'session' : 'sessions'} given to the community
          </span>
        </div>
      )}
    </Card>
  );
}
