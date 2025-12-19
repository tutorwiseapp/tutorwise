/**
 * Filename: apps/web/src/lib/api/help-centre.ts
 * Purpose: Help Centre API functions for tracking analytics
 * Created: 2025-01-19
 */

import { createClient } from '@/lib/supabase/client';

export interface ArticleView {
  id: string;
  article_slug: string;
  profile_id: string | null;
  session_id: string | null;
  viewed_at: string;
  referrer: string | null;
}

export interface ArticleFeedback {
  id: string;
  article_slug: string;
  profile_id: string | null;
  session_id: string | null;
  was_helpful: boolean;
  comment: string | null;
  created_at: string;
}

export interface PopularArticle {
  article_slug: string;
  view_count: number;
  unique_viewers: number;
  last_viewed: string;
}

export interface ArticleHelpfulness {
  total_votes: number;
  helpful_votes: number;
  helpfulness_percentage: number;
}

export interface SearchQuery {
  id: string;
  query: string;
  profile_id: string | null;
  session_id: string | null;
  results_count: number;
  clicked_result: string | null;
  searched_at: string;
}

/**
 * Track article view (for analytics and popular articles)
 */
export async function trackArticleView(
  articleSlug: string,
  referrer?: string
): Promise<void> {
  try {
    const supabase = createClient();

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser();

    // Get or create session ID for anonymous users
    let sessionId: string | null = null;
    if (!user) {
      sessionId = getOrCreateSessionId();
    }

    const { error } = await supabase
      .from('help_article_views')
      .insert({
        article_slug: articleSlug,
        profile_id: user?.id || null,
        session_id: sessionId,
        referrer: referrer || null,
      });

    if (error) {
      console.error('Error tracking article view:', error);
    }
  } catch (error) {
    console.error('Error tracking article view:', error);
    // Don't throw - analytics failures shouldn't break the UI
  }
}

/**
 * Submit article feedback ("Was this helpful?")
 */
export async function submitArticleFeedback(
  articleSlug: string,
  wasHelpful: boolean,
  comment?: string
): Promise<void> {
  const supabase = createClient();

  // Get current user (if logged in)
  const { data: { user } } = await supabase.auth.getUser();

  // Get or create session ID for anonymous users
  let sessionId: string | null = null;
  if (!user) {
    sessionId = getOrCreateSessionId();
  }

  const { error } = await supabase
    .from('help_article_feedback')
    .upsert({
      article_slug: articleSlug,
      profile_id: user?.id || null,
      session_id: sessionId,
      was_helpful: wasHelpful,
      comment: comment || null,
    }, {
      onConflict: 'article_slug,profile_id,session_id',
    });

  if (error) {
    throw new Error(`Failed to submit feedback: ${error.message}`);
  }
}

/**
 * Get popular articles
 */
export async function getPopularArticles(limit: number = 5): Promise<PopularArticle[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('get_popular_help_articles', { limit_count: limit });

  if (error) {
    console.error('Error fetching popular articles:', error);
    return [];
  }

  return data || [];
}

/**
 * Get article helpfulness score
 */
export async function getArticleHelpfulness(articleSlug: string): Promise<ArticleHelpfulness | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('get_article_helpfulness', { p_article_slug: articleSlug });

  if (error) {
    console.error('Error fetching article helpfulness:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Track search query (for content gap analysis)
 */
export async function trackSearchQuery(
  query: string,
  resultsCount: number,
  clickedResult?: string
): Promise<void> {
  try {
    const supabase = createClient();

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser();

    // Get or create session ID for anonymous users
    let sessionId: string | null = null;
    if (!user) {
      sessionId = getOrCreateSessionId();
    }

    const { error } = await supabase
      .from('help_search_queries')
      .insert({
        query,
        profile_id: user?.id || null,
        session_id: sessionId,
        results_count: resultsCount,
        clicked_result: clickedResult || null,
      });

    if (error) {
      console.error('Error tracking search query:', error);
    }
  } catch (error) {
    console.error('Error tracking search query:', error);
    // Don't throw - analytics failures shouldn't break the UI
  }
}

/**
 * Helper: Get or create session ID for anonymous users
 */
function getOrCreateSessionId(): string {
  const key = 'tutorwise_help_session_id';
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem(key, sessionId);
  }

  return sessionId;
}
