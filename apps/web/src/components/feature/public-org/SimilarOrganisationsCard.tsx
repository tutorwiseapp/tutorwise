/**
 * Filename: SimilarOrganisationsCard.tsx
 * Purpose: Similar organisations scroll rail using MarketplaceOrganisationCard shell
 */

'use client';

import { ArrowRight } from 'lucide-react';
import Card from '@/components/ui/data-display/Card';
import MarketplaceOrganisationCard from '@/components/feature/marketplace/MarketplaceOrganisationCard';
import styles from './SimilarOrganisationsCard.module.css';

interface Organisation {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  logo_url?: string;
  location_city?: string;
  tagline?: string;
  caas_score?: number;
  avg_rating?: number;
  total_tutors?: number;
}

interface SimilarOrganisationsCardProps {
  organisations: Organisation[];
  currentOrganisationId: string;
}

export function SimilarOrganisationsCard({
  organisations,
  currentOrganisationId,
}: SimilarOrganisationsCardProps) {
  const filtered = organisations
    .filter((org) => org.id !== currentOrganisationId)
    .slice(0, 6);

  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>You might also like</h2>
        <a href="/org" className={styles.seeAllLink}>
          See all organisations
          <ArrowRight size={13} />
        </a>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.emptyMessage}>No similar organisations yet.</p>
      ) : (
      <div className={styles.cardContent}>
        <div className={styles.scrollContainer}>
          {filtered.map((org) => (
            <div key={org.id} className={styles.cardWrapper}>
              <MarketplaceOrganisationCard
                organisation={{
                  id: org.id,
                  name: org.name,
                  slug: org.slug,
                  avatar_url: org.logo_url || org.avatar_url,
                  location_city: org.location_city,
                  tagline: org.tagline,
                  caas_score: org.caas_score,
                  avg_rating: org.avg_rating,
                  total_tutors: org.total_tutors,
                } as any}
              />
            </div>
          ))}
        </div>
      </div>
      )}
    </Card>
  );
}
