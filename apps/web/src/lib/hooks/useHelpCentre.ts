/**
 * Filename: apps/web/src/lib/hooks/useHelpCentre.ts
 * Purpose: React Query hooks for Help Centre data fetching
 * Created: 2025-12-21
 * Pattern: Consistent with home page React Query implementation
 */

'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { searchArticles, type ArticleSearchResult } from '@/app/(public)/help-centre/actions';
import {
  getPopularArticles,
  trackArticleView,
  submitArticleFeedback,
  trackSearchQuery,
  type PopularArticle,
  type ArticleHelpfulness,
  getArticleHelpfulness,
} from '@/lib/api/help-centre';

/**
 * Hook: Search articles with React Query
 *
 * Features:
 * - Automatic caching (5min staleTime)
 * - placeholderData to prevent flickering
 * - Only runs when query is provided
 * - Consistent with user/admin dashboard pattern
 */
export function useSearchArticles(query: string | null) {
  return useQuery({
    queryKey: ['help-centre-search', query],
    queryFn: async () => {
      if (!query) return [];
      const results = await searchArticles(query);

      // Track search query for analytics
      trackSearchQuery(query, results.length).catch(console.error);

      return results;
    },
    enabled: !!query && query.length > 0,
    placeholderData: keepPreviousData, // Prevents skeleton flickering on refetch
    staleTime: 5 * 60 * 1000, // 5 minutes (same as home page featured items)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook: Get popular articles
 *
 * Features:
 * - Long cache time (10min) since popular articles change slowly
 * - Full optimization matching user/admin dashboard pattern
 */
export function usePopularArticles(limit: number = 5) {
  return useQuery({
    queryKey: ['help-centre-popular', limit],
    queryFn: () => getPopularArticles(limit),
    placeholderData: keepPreviousData, // Prevents skeleton flickering on refetch
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook: Get article helpfulness score
 *
 * Features:
 * - Cached per article slug
 * - Moderate cache time (3min) to show updated feedback
 * - Full optimization matching user/admin dashboard pattern
 */
export function useArticleHelpfulness(articleSlug: string) {
  return useQuery({
    queryKey: ['help-centre-helpfulness', articleSlug],
    queryFn: () => getArticleHelpfulness(articleSlug),
    placeholderData: keepPreviousData, // Prevents skeleton flickering on refetch
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Auto-refresh when user returns to tab
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook: Track article view (mutation)
 *
 * Fire-and-forget mutation for analytics
 * Does not invalidate any queries
 */
export function useTrackArticleView() {
  return useMutation({
    mutationFn: async ({ articleSlug, referrer }: { articleSlug: string; referrer?: string }) => {
      await trackArticleView(articleSlug, referrer);
    },
    onError: (error) => {
      // Silent fail - analytics failures shouldn't break UI
      console.error('Failed to track article view:', error);
    },
  });
}

/**
 * Hook: Submit article feedback (mutation)
 *
 * Features:
 * - Invalidates helpfulness query to show updated score
 * - Optimistic updates possible if needed
 */
export function useSubmitArticleFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      articleSlug,
      wasHelpful,
      comment,
    }: {
      articleSlug: string;
      wasHelpful: boolean;
      comment?: string;
    }) => {
      await submitArticleFeedback(articleSlug, wasHelpful, comment);
    },
    onSuccess: (_, variables) => {
      // Invalidate helpfulness query to refetch updated score
      queryClient.invalidateQueries({
        queryKey: ['help-centre-helpfulness', variables.articleSlug],
      });
    },
    onError: (error) => {
      console.error('Failed to submit feedback:', error);
      throw error; // Re-throw so UI can show error message
    },
  });
}

/**
 * Hook: Track search query (mutation)
 *
 * Fire-and-forget mutation for analytics
 */
export function useTrackSearchQuery() {
  return useMutation({
    mutationFn: async ({
      query,
      resultsCount,
      clickedResult,
    }: {
      query: string;
      resultsCount: number;
      clickedResult?: string;
    }) => {
      await trackSearchQuery(query, resultsCount, clickedResult);
    },
    onError: (error) => {
      console.error('Failed to track search query:', error);
    },
  });
}
