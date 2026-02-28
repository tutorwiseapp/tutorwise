/**
 * AI Tutor Limits Based on CaaS Score
 *
 * Graduated limits system that restricts the number of AI tutors
 * a user can create based on their Credibility as a Service (CaaS) score.
 *
 * @module lib/ai-agents/limits
 */

export interface CaaSLimitTier {
  minScore: number;
  maxScore: number;
  maxAIAgents: number;
  tierName: string;
  tierColor: string;
  description: string;
}

/**
 * CaaS Score to AI Tutor Limit Tiers
 *
 * Graduated system that rewards higher credibility with more AI tutors
 */
export const CAAS_LIMIT_TIERS: CaaSLimitTier[] = [
  {
    minScore: 0,
    maxScore: 49,
    maxAIAgents: 0,
    tierName: 'No Access',
    tierColor: '#ef4444',
    description: 'Complete your profile and verification to unlock AI Studio',
  },
  {
    minScore: 50,
    maxScore: 69,
    maxAIAgents: 1,
    tierName: 'Starter',
    tierColor: '#f59e0b',
    description: 'Create your first AI tutor to get started',
  },
  {
    minScore: 70,
    maxScore: 79,
    maxAIAgents: 3,
    tierName: 'Growing',
    tierColor: '#3b82f6',
    description: 'Expand with up to 3 specialized AI tutors',
  },
  {
    minScore: 80,
    maxScore: 89,
    maxAIAgents: 10,
    tierName: 'Professional',
    tierColor: '#8b5cf6',
    description: 'Scale your tutoring with up to 10 AI tutors',
  },
  {
    minScore: 90,
    maxScore: 100,
    maxAIAgents: 50,
    tierName: 'Elite',
    tierColor: '#10b981',
    description: 'Maximum capacity: 50 AI tutors for top-tier educators',
  },
];

/**
 * Get the limit tier for a given CaaS score
 */
export function getLimitTierForScore(caasScore: number | null | undefined): CaaSLimitTier {
  // Default to lowest tier if no score
  if (caasScore === null || caasScore === undefined) {
    return CAAS_LIMIT_TIERS[0];
  }

  // Find the matching tier
  const tier = CAAS_LIMIT_TIERS.find(
    (t) => caasScore >= t.minScore && caasScore <= t.maxScore
  );

  // Return matching tier or lowest tier as fallback
  return tier || CAAS_LIMIT_TIERS[0];
}

/**
 * Get the next tier for upgrade incentive
 */
export function getNextTier(currentTier: CaaSLimitTier): CaaSLimitTier | null {
  const currentIndex = CAAS_LIMIT_TIERS.findIndex((t) => t.tierName === currentTier.tierName);

  if (currentIndex === -1 || currentIndex === CAAS_LIMIT_TIERS.length - 1) {
    return null; // Already at max tier
  }

  return CAAS_LIMIT_TIERS[currentIndex + 1];
}

/**
 * Calculate how many more AI tutors can be created
 */
export function getRemainingSlots(
  caasScore: number | null | undefined,
  currentCount: number
): number {
  const tier = getLimitTierForScore(caasScore);
  return Math.max(0, tier.maxAIAgents - currentCount);
}

/**
 * Check if user can create another AI tutor
 */
export function canCreateAIAgent(
  caasScore: number | null | undefined,
  currentCount: number
): boolean {
  return getRemainingSlots(caasScore, currentCount) > 0;
}

/**
 * Get upgrade suggestions for users at their limit
 */
export function getUpgradeSuggestions(caasScore: number | null | undefined): string[] {
  const currentTier = getLimitTierForScore(caasScore);
  const nextTier = getNextTier(currentTier);

  if (!nextTier) {
    return ['You\'re at the maximum tier! 🎉'];
  }

  const suggestions: string[] = [];
  const scoreNeeded = nextTier.minScore - (caasScore || 0);

  if (scoreNeeded > 0) {
    suggestions.push(`Increase your CaaS score by ${scoreNeeded} points to unlock ${nextTier.tierName} tier`);
  }

  // Add specific suggestions based on current score
  if ((caasScore || 0) < 50) {
    suggestions.push('Complete your profile information');
    suggestions.push('Upload identity verification documents');
    suggestions.push('Get your first review from a student');
  } else if ((caasScore || 0) < 70) {
    suggestions.push('Complete more tutoring sessions');
    suggestions.push('Upload professional qualifications');
    suggestions.push('Maintain a high average rating');
  } else if ((caasScore || 0) < 80) {
    suggestions.push('Build your session history (10+ sessions)');
    suggestions.push('Get positive client reviews');
    suggestions.push('Keep your profile up-to-date');
  } else if ((caasScore || 0) < 90) {
    suggestions.push('Achieve excellence: 4.5+ average rating');
    suggestions.push('Complete 50+ tutoring sessions');
    suggestions.push('Upload advanced qualifications');
  }

  return suggestions;
}
