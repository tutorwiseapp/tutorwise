/**
 * Filename: AboutCard.tsx
 * Purpose: About section displaying profile bio/description
 * Created: 2025-11-12
 * Updated: 2025-11-16 - Added Community Tutor badge and free sessions stat (v5.9)
 */

'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import { Heart } from 'lucide-react';
import styles from './AboutCard.module.css';

interface AboutCardProps {
  profile: Profile;
}

export function AboutCard({ profile }: AboutCardProps) {
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;
  const [freeSessionsCount, setFreeSessionsCount] = useState<number | null>(null);

  // v5.9: Fetch free sessions count if tutor participates in free help
  useEffect(() => {
    const fetchFreeSessionsCount = async () => {
      try {
        const response = await fetch(`/api/stats/free-sessions-count?profileId=${profile.id}`);
        if (response.ok) {
          const data = await response.json();
          setFreeSessionsCount(data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch free sessions count:', error);
      }
    };

    // Only fetch if profile has available_free_help flag or if they might have historical data
    if (profile.id) {
      fetchFreeSessionsCount();
    }
  }, [profile.id]);

  // Determine if tutor is a "Community Tutor" (has given at least 1 free session)
  const isCommunityTutor = freeSessionsCount !== null && freeSessionsCount > 0;

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
