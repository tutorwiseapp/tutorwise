/**
 * Filename: AITutorMarketplaceCard.tsx
 * Purpose: Marketplace card for AI tutors
 * Created: 2026-02-23
 * Version: v1.0
 */

'use client';

import { useState } from 'react';
import type { AIAgentProfile } from '@/types/marketplace';
import MarketplaceCard from './MarketplaceCard';
import styles from './MarketplaceCard.module.css';

interface AIAgentMarketplaceCardProps {
  aiAgent: AIAgentProfile;
}

export default function AIAgentMarketplaceCard({ aiAgent }: AIAgentMarketplaceCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      // TODO: Implement save/bookmark functionality
      setIsSaved(!isSaved);
    } finally {
      setIsLoading(false);
    }
  };

  const badges = [
    // AI Badge (top-left)
    <div key="ai-badge" className={styles.topLeftBadge}>
      <div className={styles.aiBadge}>🤖 AI Agent</div>
    </div>,

    // Available Badge (top-right)
    <div key="available-badge" className={styles.topRightBadge}>
      <div className={styles.instantBadge}>⚡ Instant</div>
    </div>,
  ];

  return (
    <MarketplaceCard
      href={`/marketplace/ai-agents/${aiAgent.name}`}
      imageUrl={aiAgent.avatar_url}
      imageFallback={
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#006c67',
            fontSize: '3rem',
          }}
        >
          🤖
        </div>
      }
      badges={badges}
      onSave={handleSave}
      isSaved={isSaved}
      isLoading={isLoading}
    >
      {/* Line 1: Name and Rating */}
      <div className={styles.infoLine}>
        <span className={styles.tutorName}>{aiAgent.display_name}</span>
        {aiAgent.avg_rating && (aiAgent.total_reviews ?? 0) > 0 && (
          <div className={styles.rating}>
            <span className={styles.star}>⭐</span>
            <span className={styles.ratingValue}>
              {aiAgent.avg_rating.toFixed(1)}
            </span>
            <span className={styles.reviewCount}>
              ({aiAgent.total_reviews})
            </span>
          </div>
        )}
      </div>

      {/* Line 2: Subject and Primary Skills */}
      <div className={styles.infoLine}>
        <span className={styles.subjects}>
          {aiAgent.subject}
          {aiAgent.skills && aiAgent.skills.length > 0 && (
            <> • {aiAgent.skills.slice(0, 2).join(', ')}</>
          )}
        </span>
      </div>

      {/* Line 3: Sessions and Availability */}
      <div className={styles.infoLine}>
        <span className={styles.location}>
          {(aiAgent.total_sessions ?? 0) > 0
            ? `${aiAgent.total_sessions} sessions completed`
            : 'New AI agent'}
        </span>
        <span className={styles.separator}>•</span>
        <span className={styles.availability}>Available 24/7</span>
      </div>

      {/* Line 4: Price */}
      <div className={styles.infoLine}>
        <div className={styles.price}>
          <span className={styles.priceAmount}>
            £{aiAgent.price_per_hour}
          </span>
          <span className={styles.priceUnit}> / hour</span>
        </div>
      </div>
    </MarketplaceCard>
  );
}
