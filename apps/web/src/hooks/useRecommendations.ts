/**
 * Filename: useRecommendations.ts
 * Purpose: React hook for fetching personalized recommendations
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Recommended for You
 */

import { useState, useEffect, useCallback } from 'react';
import type { Listing } from '@tutorwise/shared-types';
import type { MatchScore } from '@/lib/services/matchScoring';

export interface RecommendedItem extends Listing {
  matchScore?: MatchScore;
  type: 'listing';
}

interface UseRecommendationsOptions {
  role?: string;
  limit?: number;
  excludeIds?: string[];
  enabled?: boolean; // Auto-fetch on mount
}

interface UseRecommendationsReturn {
  recommendations: RecommendedItem[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  fetchRecommendations: () => Promise<void>;
  hasMore: boolean;
}

export function useRecommendations(
  options: UseRecommendationsOptions = {}
): UseRecommendationsReturn {
  const {
    role,
    limit = 6,
    excludeIds = [],
    enabled = true,
  } = options;

  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', '0');

      if (role) {
        params.append('role', role);
      }

      if (excludeIds.length > 0) {
        params.append('exclude', excludeIds.join(','));
      }

      const response = await fetch(`/api/marketplace/recommendations?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - no recommendations
          setRecommendations([]);
          setTotal(0);
          return;
        }
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Recommendations fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [role, limit, excludeIds]);

  useEffect(() => {
    if (enabled) {
      fetchRecommendations();
    }
  }, [enabled, fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    total,
    fetchRecommendations,
    hasMore: recommendations.length < total,
  };
}
