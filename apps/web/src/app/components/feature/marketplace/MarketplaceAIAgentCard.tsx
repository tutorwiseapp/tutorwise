/*
 * Filename: MarketplaceAIAgentCard.tsx
 * Purpose: Public marketplace AI AGENT card (uses MarketplaceCard shell)
 * Used in: SimilarAIAgentsCard, AI agent browse pages
 *
 * Design Pattern: Uses MarketplaceCard shell component
 * - Consistent with TutorProfileCard, MarketplaceListingCard, MarketplaceOrganisationCard
 */

'use client';

import getProfileImageUrl from '@/lib/utils/image';
import MarketplaceCard, {
  CardRow,
  CardName,
  CardRating,
  CardSubject,
  CardPrice,
  CardBookLink,
} from './MarketplaceCard';

export interface AIAgentCardData {
  id: string;
  display_name: string;
  name: string;
  avatar_url?: string;
  subject: string;
  avg_rating?: number;
  total_sessions?: number;
  price_per_hour: number;
}

interface MarketplaceAIAgentCardProps {
  agent: AIAgentCardData;
}

export default function MarketplaceAIAgentCard({ agent }: MarketplaceAIAgentCardProps) {
  const imageUrl = getProfileImageUrl(
    { id: agent.id, avatar_url: agent.avatar_url, full_name: agent.display_name },
    true,
    undefined,
    'ai-agent'
  );

  return (
    <MarketplaceCard
      href={`/marketplace/ai-agents/${agent.name}`}
      imageUrl={imageUrl}
      badges={[]}
    >
      {/* Line 1: Name & Rating */}
      <CardRow>
        <CardName>{agent.display_name}</CardName>
        {agent.avg_rating ? <CardRating value={agent.avg_rating} /> : null}
      </CardRow>

      {/* Line 2: Subject */}
      <CardRow>
        <CardSubject>{agent.subject}</CardSubject>
      </CardRow>

      {/* Line 3: Sessions count */}
      <CardRow>
        <CardSubject>
          {agent.total_sessions ? `${agent.total_sessions} sessions` : 'AI Tutor'}
        </CardSubject>
      </CardRow>

      {/* Line 4: Price & CTA */}
      <CardRow>
        <CardPrice>£{agent.price_per_hour}/hr</CardPrice>
        <CardBookLink href={`/marketplace/ai-agents/${agent.name}`}>
          Start Session
        </CardBookLink>
      </CardRow>
    </MarketplaceCard>
  );
}
