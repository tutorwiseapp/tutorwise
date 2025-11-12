/**
 * Filename: AboutCard.tsx
 * Purpose: About section displaying profile bio/description
 * Created: 2025-11-12
 */

import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import styles from './AboutCard.module.css';

interface AboutCardProps {
  profile: Profile;
}

export function AboutCard({ profile }: AboutCardProps) {
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  // If no bio, show empty state
  if (!profile.bio) {
    return (
      <Card className={styles.aboutCard}>
        <h2 className={styles.cardTitle}>About</h2>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {firstName} hasn&apos;t added their description yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.aboutCard}>
      <h2 className={styles.cardTitle}>About</h2>
      <div className={styles.bioContent}>
        <p className={styles.bioText}>{profile.bio}</p>
      </div>
    </Card>
  );
}
