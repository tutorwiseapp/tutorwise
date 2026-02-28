/**
 * Filename: api/ai-agents/limits/route.ts
 * Purpose: AI Tutor Graduated Limits API
 * Created: 2026-02-23
 * Version: v1.0
 *
 * Routes:
 * - GET /api/ai-agents/limits - Get user's AI tutor creation limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getLimitTierForScore,
  getNextTier,
  getRemainingSlots,
  canCreateAIAgent,
  getUpgradeSuggestions,
} from '@/lib/ai-agents/limits';

/**
 * GET /api/ai-agents/limits
 * Get AI tutor creation limits for current user with tier information
 *
 * Returns:
 * {
 *   allowed: boolean
 *   current: number
 *   limit: number
 *   remaining: number
 *   caas_score: number
 *   tier: {
 *     tierName: string
 *     tierColor: string
 *     maxAIAgents: number
 *     description: string
 *   }
 *   nextTier: { ... } | null
 *   upgradeSuggestions: string[]
 * }
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's CaaS score
    const { data: profile } = await supabase
      .from('profiles')
      .select('caas_score')
      .eq('id', user.id)
      .single();

    const caasScore = profile?.caas_score ?? 0;

    // Get current AI tutor count
    const { count: currentCount, error: countError } = await supabase
      .from('ai_agents')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (countError) {
      console.error('Error counting AI tutors:', countError);
      return NextResponse.json(
        { error: 'Failed to check AI tutor limits' },
        { status: 500 }
      );
    }

    const current = currentCount || 0;
    const tier = getLimitTierForScore(caasScore);
    const nextTier = getNextTier(tier);
    const remaining = getRemainingSlots(caasScore, current);
    const allowed = canCreateAIAgent(caasScore, current);
    const upgradeSuggestions = getUpgradeSuggestions(caasScore);

    return NextResponse.json(
      {
        allowed,
        current,
        limit: tier.maxAIAgents,
        remaining,
        caasScore,
        tier: {
          tierName: tier.tierName,
          tierColor: tier.tierColor,
          minScore: tier.minScore,
          maxScore: tier.maxScore,
          maxAIAgents: tier.maxAIAgents,
          description: tier.description,
        },
        nextTier: nextTier
          ? {
              tierName: nextTier.tierName,
              tierColor: nextTier.tierColor,
              minScore: nextTier.minScore,
              maxScore: nextTier.maxScore,
              maxAIAgents: nextTier.maxAIAgents,
              description: nextTier.description,
            }
          : null,
        upgradeSuggestions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking AI tutor limits:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to check limits' },
      { status: 500 }
    );
  }
}
