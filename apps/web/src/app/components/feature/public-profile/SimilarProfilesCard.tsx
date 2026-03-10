/*
 * Filename: SimilarProfilesCard.tsx
 * Purpose: Similar tutor profiles scroll rail using TutorProfileCard (MarketplaceCard shell)
 */

'use client';

import { ArrowRight } from 'lucide-react';
import Card from '@/app/components/ui/data-display/Card';
import TutorProfileCard from '@/app/components/feature/marketplace/TutorProfileCard';
import styles from './SimilarProfilesCard.module.css';

interface SimilarProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  active_role: string;
  slug?: string;
  professional_details?: {
    tutor?: { subjects?: string[] };
    client?: { subjects?: string[] };
    agent?: { services?: string[] };
  };
  average_rating?: number;
  total_reviews?: number;
}

interface SimilarProfilesCardProps {
  profiles: SimilarProfile[];
}

export function SimilarProfilesCard({ profiles = [] }: SimilarProfilesCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>You might also like</h2>
        <a href="/marketplace" className={styles.seeAllLink}>
          See all tutors
          <ArrowRight size={13} />
        </a>
      </div>

      {profiles.length === 0 ? (
        <p className={styles.emptyMessage}>No similar tutors yet.</p>
      ) : (
      <div className={styles.cardContent}>
        <div className={styles.scrollContainer}>
          {profiles.map((profile) => {
            const subjects =
              profile.professional_details?.tutor?.subjects ||
              profile.professional_details?.client?.subjects ||
              [];

            return (
              <div key={profile.id} className={styles.cardWrapper}>
                <TutorProfileCard
                  profile={{
                    id: profile.id,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    city: profile.city,
                    subjects,
                    average_rating: profile.average_rating,
                    review_count: profile.total_reviews,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      )}
    </Card>
  );
}
