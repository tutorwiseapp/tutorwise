/**
 * Filename: src/services/seo/eligibility-resolver.ts
 * Purpose: Determines SEO eligibility based on trust signals (CaaS, referrals, network)
 * Created: 2025-12-31
 *
 * This resolver evaluates whether a page/entity should be exposed to search engines
 * based on a weighted composite of:
 * - CaaS credibility score (0-100)
 * - Referral activity (count and depth)
 * - Network trust density (connections to high-trust actors)
 * - Content quality score (existing SEO score)
 */

import { createClient } from '@/utils/supabase/client';

export type EntityType = 'tutor' | 'listing' | 'hub' | 'spoke' | 'profile';

export interface SEOEligibilityInput {
  entityType: EntityType;
  entityId: string;

  // Optional: if provided, skip database fetch
  caasScore?: number;
  referralCount?: number;
  referralDepth?: number;
  networkTrustDensity?: number;
  contentScore?: number;
}

export interface SEOEligibilityResult {
  isEligible: boolean;
  eligibilityScore: number; // 0-100 composite score
  indexDirective: 'index' | 'noindex';
  followDirective: 'follow' | 'nofollow';
  reasons: string[];

  breakdown: {
    caasWeight: number;
    referralWeight: number;
    networkWeight: number;
    contentWeight: number;
  };

  rawScores: {
    caasScore: number;
    referralScore: number;
    networkScore: number;
    contentScore: number;
  };
}

interface EligibilityThresholds {
  caas_min_score: number;
  referral_min_count: number;
  network_min_density: number;
  content_min_score: number;
  composite_min_score: number;
}

interface EligibilityWeights {
  caas: number;
  referral: number;
  network: number;
  content: number;
}

/**
 * SEO Eligibility Resolver
 * Implements trust-first visibility logic
 */
export class SEOEligibilityResolver {
  private supabase = createClient();

  // Default thresholds (overridden by seo_settings)
  private defaultThresholds: EligibilityThresholds = {
    caas_min_score: 60,
    referral_min_count: 1,
    network_min_density: 0.3,
    content_min_score: 60,
    composite_min_score: 75,
  };

  // Default weights by entity type
  private defaultWeights: Record<EntityType, EligibilityWeights> = {
    tutor: { caas: 0.4, referral: 0.3, network: 0.2, content: 0.1 },
    profile: { caas: 0.4, referral: 0.3, network: 0.2, content: 0.1 },
    listing: { caas: 0.3, referral: 0.3, network: 0.2, content: 0.2 },
    hub: { caas: 0.1, referral: 0.2, network: 0.1, content: 0.6 },
    spoke: { caas: 0.1, referral: 0.2, network: 0.1, content: 0.6 },
  };

  /**
   * Evaluate SEO eligibility for an entity
   */
  async evaluateEligibility(
    input: SEOEligibilityInput
  ): Promise<SEOEligibilityResult> {
    // Fetch configuration from database
    const thresholds = await this.getThresholds();
    const weights = await this.getWeights(input.entityType);

    // Fetch trust signals (if not provided)
    const caasScore = input.caasScore ?? (await this.getCaaSScore(input.entityId));
    const referralMetrics = await this.getReferralMetrics(
      input.entityId,
      input.referralCount,
      input.referralDepth
    );
    const networkMetrics = await this.getNetworkMetrics(
      input.entityId,
      input.networkTrustDensity
    );
    const contentScore = input.contentScore ?? (await this.getContentScore(input.entityType, input.entityId));

    // Calculate normalized scores (0-100 scale)
    const normalizedReferralScore = this.normalizeReferralScore(referralMetrics);
    const normalizedNetworkScore = networkMetrics.trustDensity * 100;

    // Calculate weighted composite score
    const eligibilityScore =
      caasScore * weights.caas +
      normalizedReferralScore * weights.referral +
      normalizedNetworkScore * weights.network +
      contentScore * weights.content;

    // Determine eligibility
    const isEligible = this.meetsThresholds(
      {
        caasScore,
        referralCount: referralMetrics.count,
        networkDensity: networkMetrics.trustDensity,
        contentScore,
        compositeScore: eligibilityScore,
      },
      thresholds
    );

    // Build explanation
    const reasons = this.buildReasons(isEligible, {
      caasScore,
      referralMetrics,
      networkMetrics,
      contentScore,
      eligibilityScore,
      thresholds,
    });

    return {
      isEligible,
      eligibilityScore: Math.round(eligibilityScore),
      indexDirective: isEligible ? 'index' : 'noindex',
      followDirective: isEligible ? 'follow' : 'nofollow',
      reasons,
      breakdown: {
        caasWeight: caasScore * weights.caas,
        referralWeight: normalizedReferralScore * weights.referral,
        networkWeight: normalizedNetworkScore * weights.network,
        contentWeight: contentScore * weights.content,
      },
      rawScores: {
        caasScore,
        referralScore: normalizedReferralScore,
        networkScore: normalizedNetworkScore,
        contentScore,
      },
    };
  }

  /**
   * Get CaaS credibility score for user
   */
  private async getCaaSScore(entityId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('caas_scores')
        .select('total_score')
        .eq('user_id', entityId)
        .maybeSingle();

      if (error || !data) return 0;
      return data.total_score ?? 0;
    } catch (error) {
      console.error('Error fetching CaaS score:', error);
      return 0;
    }
  }

  /**
   * Get referral metrics for entity
   */
  private async getReferralMetrics(
    entityId: string,
    providedCount?: number,
    providedDepth?: number
  ): Promise<{ count: number; depth: number; score: number }> {
    if (providedCount !== undefined && providedDepth !== undefined) {
      return {
        count: providedCount,
        depth: providedDepth,
        score: this.calculateReferralScore(providedCount, providedDepth),
      };
    }

    try {
      // Count referrals created by this user
      const { count, error: countError } = await this.supabase
        .from('referral_links')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', entityId);

      if (countError) {
        console.error('Error fetching referral count:', countError);
        return { count: 0, depth: 0, score: 0 };
      }

      // Calculate referral depth (simplified: 1 for now, will enhance in Phase 3)
      const depth = (count ?? 0) > 0 ? 1 : 0;

      return {
        count: count ?? 0,
        depth,
        score: this.calculateReferralScore(count ?? 0, depth),
      };
    } catch (error) {
      console.error('Error fetching referral metrics:', error);
      return { count: 0, depth: 0, score: 0 };
    }
  }

  /**
   * Calculate referral score from count and depth
   * Returns 0-100 score
   */
  private calculateReferralScore(count: number, depth: number): number {
    // Scoring formula:
    // - Each referral: +10 points (capped at 80)
    // - Each depth level: +5 points (capped at 20)
    const countScore = Math.min(count * 10, 80);
    const depthScore = Math.min(depth * 5, 20);
    return Math.min(countScore + depthScore, 100);
  }

  /**
   * Normalize referral metrics to 0-100 score
   */
  private normalizeReferralScore(metrics: {
    count: number;
    depth: number;
    score: number;
  }): number {
    return metrics.score;
  }

  /**
   * Get network trust metrics
   * Returns trust density (0-1) and count
   */
  private async getNetworkMetrics(
    entityId: string,
    providedDensity?: number
  ): Promise<{ trustDensity: number; connectionCount: number }> {
    if (providedDensity !== undefined) {
      return { trustDensity: providedDensity, connectionCount: 0 };
    }

    try {
      // For now, use connection count as proxy
      // Will be replaced with actual network_trust_metrics in Phase 3
      const { count, error } = await this.supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .or(`from_user_id.eq.${entityId},to_user_id.eq.${entityId}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching network metrics:', error);
        return { trustDensity: 0, connectionCount: 0 };
      }

      // Simple density calculation: connections / 20 (capped at 1.0)
      const trustDensity = Math.min((count ?? 0) / 20, 1.0);

      return {
        trustDensity,
        connectionCount: count ?? 0,
      };
    } catch (error) {
      console.error('Error fetching network metrics:', error);
      return { trustDensity: 0, connectionCount: 0 };
    }
  }

  /**
   * Get content quality score
   */
  private async getContentScore(
    entityType: EntityType,
    entityId: string
  ): Promise<number> {
    if (entityType === 'hub' || entityType === 'spoke') {
      try {
        const table = entityType === 'hub' ? 'seo_hubs' : 'seo_spokes';
        const { data, error } = await this.supabase
          .from(table)
          .select('seo_score')
          .eq('id', entityId)
          .maybeSingle();

        if (error || !data) return 0;
        return data.seo_score ?? 0;
      } catch (error) {
        console.error('Error fetching content score:', error);
        return 0;
      }
    }

    // For profiles/listings, default to 100 (content quality N/A)
    return 100;
  }

  /**
   * Check if entity meets all thresholds
   */
  private meetsThresholds(
    scores: {
      caasScore: number;
      referralCount: number;
      networkDensity: number;
      contentScore: number;
      compositeScore: number;
    },
    thresholds: EligibilityThresholds
  ): boolean {
    return (
      scores.caasScore >= thresholds.caas_min_score &&
      scores.referralCount >= thresholds.referral_min_count &&
      scores.networkDensity >= thresholds.network_min_density &&
      scores.contentScore >= thresholds.content_min_score &&
      scores.compositeScore >= thresholds.composite_min_score
    );
  }

  /**
   * Build human-readable reasons for eligibility decision
   */
  private buildReasons(
    isEligible: boolean,
    context: {
      caasScore: number;
      referralMetrics: { count: number; depth: number };
      networkMetrics: { trustDensity: number; connectionCount: number };
      contentScore: number;
      eligibilityScore: number;
      thresholds: EligibilityThresholds;
    }
  ): string[] {
    const reasons: string[] = [];

    if (isEligible) {
      reasons.push(
        `Composite score ${Math.round(context.eligibilityScore)}/100 meets threshold (${context.thresholds.composite_min_score})`
      );

      if (context.caasScore >= 80) {
        reasons.push(`High credibility score (${context.caasScore}/100)`);
      }

      if (context.referralMetrics.count >= 5) {
        reasons.push(`Strong referral activity (${context.referralMetrics.count} referrals)`);
      }

      if (context.networkMetrics.connectionCount >= 10) {
        reasons.push(`Well-connected in network (${context.networkMetrics.connectionCount} connections)`);
      }
    } else {
      reasons.push(
        `Composite score ${Math.round(context.eligibilityScore)}/100 below threshold (${context.thresholds.composite_min_score})`
      );

      if (context.caasScore < context.thresholds.caas_min_score) {
        reasons.push(
          `Low credibility score (${context.caasScore}/100, need ${context.thresholds.caas_min_score})`
        );
      }

      if (context.referralMetrics.count < context.thresholds.referral_min_count) {
        reasons.push(
          `Insufficient referrals (${context.referralMetrics.count}, need ${context.thresholds.referral_min_count})`
        );
      }

      if (context.networkMetrics.trustDensity < context.thresholds.network_min_density) {
        reasons.push(
          `Low network density (${(context.networkMetrics.trustDensity * 100).toFixed(1)}%, need ${(context.thresholds.network_min_density * 100).toFixed(1)}%)`
        );
      }

      if (context.contentScore < context.thresholds.content_min_score) {
        reasons.push(
          `Low content quality (${context.contentScore}/100, need ${context.thresholds.content_min_score})`
        );
      }
    }

    return reasons;
  }

  /**
   * Get thresholds from database settings (with fallback to defaults)
   */
  private async getThresholds(): Promise<EligibilityThresholds> {
    try {
      const { data, error } = await this.supabase
        .from('seo_settings')
        .select('eligibility_thresholds')
        .maybeSingle();

      if (error || !data || !data.eligibility_thresholds) {
        return this.defaultThresholds;
      }

      return {
        ...this.defaultThresholds,
        ...data.eligibility_thresholds,
      };
    } catch (error) {
      console.error('Error fetching eligibility thresholds:', error);
      return this.defaultThresholds;
    }
  }

  /**
   * Get weights from database settings (with fallback to defaults)
   */
  private async getWeights(entityType: EntityType): Promise<EligibilityWeights> {
    try {
      const { data, error } = await this.supabase
        .from('seo_settings')
        .select('eligibility_weights')
        .maybeSingle();

      if (error || !data || !data.eligibility_weights) {
        return this.defaultWeights[entityType];
      }

      const weights = data.eligibility_weights[entityType];
      if (!weights) {
        return this.defaultWeights[entityType];
      }

      return weights;
    } catch (error) {
      console.error('Error fetching eligibility weights:', error);
      return this.defaultWeights[entityType];
    }
  }
}

/**
 * Convenience function for quick eligibility check
 */
export async function checkSEOEligibility(
  entityType: EntityType,
  entityId: string
): Promise<SEOEligibilityResult> {
  const resolver = new SEOEligibilityResolver();
  return resolver.evaluateEligibility({ entityType, entityId });
}
