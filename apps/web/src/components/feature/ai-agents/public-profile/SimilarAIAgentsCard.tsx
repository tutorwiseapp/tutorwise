/**
 * Filename: SimilarAIAgentsCard.tsx
 * Purpose: Similar AI tutors scroll rail using MarketplaceCard shell
 */

'use client';

import { ArrowRight } from 'lucide-react';
import Card from '@/components/ui/data-display/Card';
import MarketplaceAIAgentCard from '@/components/feature/marketplace/MarketplaceAIAgentCard';
import styles from './SimilarAIAgentsCard.module.css';

export interface SimilarAgent {
  id: string;
  display_name: string;
  name: string;
  avatar_url?: string;
  subject: string;
  avg_rating?: number;
  total_sessions?: number;
  price_per_hour: number;
}

interface SimilarAIAgentsCardProps {
  agents: SimilarAgent[];
}

export function SimilarAIAgentsCard({ agents = [] }: SimilarAIAgentsCardProps) {
  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>You might also like</h2>
        <a href="/marketplace" className={styles.seeAllLink}>
          See all AI tutors
          <ArrowRight size={13} />
        </a>
      </div>

      {agents.length === 0 ? (
        <p className={styles.emptyMessage}>No similar AI tutors yet.</p>
      ) : (
        <div className={styles.cardContent}>
          <div className={styles.scrollContainer}>
            {agents.map((agent) => (
              <div key={agent.id} className={styles.cardWrapper}>
                <MarketplaceAIAgentCard agent={agent} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
