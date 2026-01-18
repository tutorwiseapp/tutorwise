/**
 * Filename: apps/web/src/lib/hooks/useResources.ts
 * Purpose: React Query hooks for Resources data fetching
 * Created: 2026-01-18
 * Pattern: Consistent with Help Centre React Query implementation
 */

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

interface ResourceArticle {
  id: string;
  title: string;
  description: string;
  slug: string;
  category: string;
  author_name: string;
  published_at: string;
  read_time: string;
  featured_image_url?: string;
  view_count?: number;
}

interface ArticlesResponse {
  articles: ResourceArticle[];
  total: number;
}

/**
 * Hook: Get featured resource articles
 *
 * Features:
 * - Automatic caching (5min staleTime)
 * - placeholderData to prevent flickering
 * - Consistent with Help Centre pattern
 */
export function useFeaturedArticles(limit: number = 4) {
  return useQuery({
    queryKey: ['resources-featured', limit],
    queryFn: async (): Promise<ResourceArticle[]> => {
      const response = await fetch(`/api/resources/articles?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch featured articles');
      }
      const data: ArticlesResponse = await response.json();
      return data.articles || [];
    },
    placeholderData: keepPreviousData, // Prevents skeleton flickering on refetch
    staleTime: 5 * 60 * 1000, // 5 minutes (same as Help Centre)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook: Get latest resource articles with optional filters
 *
 * Features:
 * - Supports category filtering and search
 * - Long cache time (10min) for static content
 * - Full optimization matching Help Centre pattern
 */
export function useLatestArticles(options: {
  limit?: number;
  category?: string | null;
  searchQuery?: string | null;
} = {}) {
  const { limit = 12, category = null, searchQuery = null } = options;

  return useQuery({
    queryKey: ['resources-latest', limit, category, searchQuery],
    queryFn: async (): Promise<ResourceArticle[]> => {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', '0');

      if (category) {
        params.append('category', category);
      }

      if (searchQuery) {
        params.append('q', searchQuery);
      }

      const response = await fetch(`/api/resources/articles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest articles');
      }
      const data: ArticlesResponse = await response.json();
      return data.articles || [];
    },
    placeholderData: keepPreviousData, // Prevents skeleton flickering on refetch
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook: Search resource articles
 *
 * Features:
 * - Only runs when query is provided
 * - Automatic caching (5min staleTime)
 * - placeholderData to prevent flickering
 */
export function useSearchArticles(query: string | null) {
  return useQuery({
    queryKey: ['resources-search', query],
    queryFn: async (): Promise<ResourceArticle[]> => {
      if (!query) return [];

      const params = new URLSearchParams();
      params.append('q', query);
      params.append('limit', '20');

      const response = await fetch(`/api/resources/articles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to search articles');
      }
      const data: ArticlesResponse = await response.json();
      return data.articles || [];
    },
    enabled: !!query && query.length > 0,
    placeholderData: keepPreviousData, // Prevents skeleton flickering on refetch
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
  });
}

export type { ResourceArticle, ArticlesResponse };
