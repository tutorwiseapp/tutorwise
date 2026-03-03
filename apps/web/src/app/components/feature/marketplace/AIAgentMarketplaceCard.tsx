/**
 * Filename: AIAgentMarketplaceCard.tsx
 * Purpose: Marketplace card for AI agents
 * Created: 2026-02-23
 * Version: v2.0 — rewritten to use MarketplaceCard helper components
 */

'use client';

import { useState } from 'react';
import getProfileImageUrl from '@/lib/utils/image';
import type { AIAgentProfile } from '@/types/marketplace';
import MarketplaceCard, {
  CardRow,
  CardName,
  CardRating,
  CardSubject,
  CardLocation,
  CardDeliveryMode,
  CardPrice,
  CardBookLink,
  TrustBadge,
} from './MarketplaceCard';

interface AIAgentMarketplaceCardProps {
  aiAgent: AIAgentProfile;
}

export default function AIAgentMarketplaceCard({ aiAgent }: AIAgentMarketplaceCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const imageUrl = getProfileImageUrl(
    {
      id: aiAgent.id,
      avatar_url: aiAgent.avatar_url || undefined,
      full_name: aiAgent.display_name,
    },
    true,        // use first-2-chars initials (listing style) to avoid "S-" from hyphenated names
    undefined,
    'ai-agent'   // still use AI agent blue color (takes priority over isListing color)
  );

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
    <TrustBadge key="ai-agent" label="AI Tutor" color="#006c67" />,
  ];

  return (
    <MarketplaceCard
      href={`/marketplace/ai-agents/${aiAgent.name}`}
      imageUrl={imageUrl}
      badges={badges}
      onSave={handleSave}
      isSaved={isSaved}
      isLoading={isLoading}
    >
      {/* Line 1: Name + Rating */}
      <CardRow>
        <CardName>{aiAgent.display_name}</CardName>
        {aiAgent.avg_rating && (aiAgent.total_reviews ?? 0) > 0 && (
          <CardRating value={aiAgent.avg_rating} />
        )}
      </CardRow>

      {/* Line 2: Subject + Skills */}
      <CardRow>
        <CardSubject>
          {aiAgent.subject}
          {aiAgent.skills && aiAgent.skills.length > 0 && (
            <> · {aiAgent.skills.slice(0, 2).join(', ')}</>
          )}
        </CardSubject>
      </CardRow>

      {/* Line 3: Availability + Session count */}
      <CardRow>
        <CardLocation>Available 24/7</CardLocation>
        <CardDeliveryMode>
          {(aiAgent.total_sessions ?? 0) > 0
            ? `${aiAgent.total_sessions} sessions`
            : 'New AI tutor'}
        </CardDeliveryMode>
      </CardRow>

      {/* Line 4: Price + CTA */}
      <CardRow>
        <CardPrice>£{aiAgent.price_per_hour}/hr</CardPrice>
        <CardBookLink href={`/marketplace/ai-agents/${aiAgent.name}`}>
          Start Session
        </CardBookLink>
      </CardRow>
    </MarketplaceCard>
  );
}
