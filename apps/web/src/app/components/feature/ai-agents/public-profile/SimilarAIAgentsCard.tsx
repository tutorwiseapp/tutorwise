/**
 * Filename: SimilarAIAgentsCard.tsx
 * Purpose: Similar AI tutors recommendation card for AI tutor public profile
 * Created: 2026-03-03
 *
 * Replaces SimilarProfilesCard. Shows other published AI tutors in the same subject.
 */

'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '@/app/components/ui/data-display/Card';
import { Star } from 'lucide-react';
import getProfileImageUrl from '@/lib/utils/image';
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
  const router = useRouter();

  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>You might also like</h2>
      </div>

      {agents.length === 0 ? (
        <p className={styles.emptyMessage}>No similar AI tutors found yet.</p>
      ) : (
        <div className={styles.cardContent}>
          <div className={styles.agentsGrid}>
            {agents.map((agent) => {
              const imageUrl = getProfileImageUrl(
                { id: agent.id, avatar_url: agent.avatar_url, full_name: agent.display_name },
                true,
                undefined,
                'ai-agent'
              );

              return (
                <button
                  key={agent.id}
                  className={styles.agentCard}
                  onClick={() => router.push(`/marketplace/ai-agents/${agent.name}`)}
                  type="button"
                >
                  <div className={styles.avatarContainer}>
                    <Image
                      src={imageUrl}
                      width={48}
                      height={48}
                      alt={agent.display_name}
                      className={styles.avatar}
                    />
                  </div>

                  <div className={styles.agentInfo}>
                    <h3 className={styles.agentName}>{agent.display_name}</h3>
                    <p className={styles.agentSubject}>{agent.subject}</p>

                    <div className={styles.agentMeta}>
                      {agent.avg_rating ? (
                        <div className={styles.rating}>
                          <Star size={13} fill="#fbbf24" stroke="#fbbf24" />
                          <span>{agent.avg_rating.toFixed(1)}</span>
                        </div>
                      ) : null}
                      <span className={styles.price}>£{agent.price_per_hour}/hr</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
