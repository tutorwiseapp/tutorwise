/**
 * Filename: lib/marketplace/ai-tutor-search.ts
 * Purpose: AI tutor marketplace search utilities
 * Created: 2026-02-23
 * Version: v1.0
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

interface AITutorSearchParams {
  query?: string;
  subjects?: string[];
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

interface AITutorSearchResult {
  id: string;
  name: string;
  display_name: string;
  description: string;
  avatar_url: string | null;
  subject: string;
  price_per_hour: number;
  currency: string;
  status: string;
  subscription_status: string;
  avg_rating: number | null;
  total_reviews: number;
  total_sessions: number;
  total_revenue: number;
  created_at: string;
  published_at: string | null;
  similarity?: number;
  rank_score?: number;
}

/**
 * Search AI tutors for marketplace
 * Fallback implementation if RPC function doesn't exist
 */
export async function searchAITutors(
  params: AITutorSearchParams
): Promise<AITutorSearchResult[]> {
  const supabase = createServiceRoleClient();

  const {
    query,
    subjects,
    minPrice,
    maxPrice,
    limit = 10,
    offset = 0,
  } = params;

  try {
    // First, try using the RPC function if it exists
    try {
      const { data, error } = await supabase.rpc('search_ai_tutors_hybrid', {
        query_embedding: null, // Will be added when we have proper embedding generation
        filter_subjects: subjects || null,
        filter_min_price: minPrice || null,
        filter_max_price: maxPrice || null,
        filter_search_text: query || null,
        match_count: limit,
        match_offset: offset,
        match_threshold: 0.3,
      });

      if (!error && data) {
        return data;
      }
    } catch (rpcError) {
      console.log('RPC function not available, using fallback search');
    }

    // Fallback: Standard SQL query
    let queryBuilder = supabase
      .from('ai_tutors')
      .select(
        `
        id,
        name,
        display_name,
        description,
        avatar_url,
        subject,
        price_per_hour,
        currency,
        status,
        subscription_status,
        avg_rating,
        total_reviews,
        total_sessions,
        total_revenue,
        created_at,
        published_at
      `
      )
      .eq('status', 'published')
      .eq('subscription_status', 'active');

    // Apply filters
    if (subjects && subjects.length > 0) {
      queryBuilder = queryBuilder.in('subject', subjects);
    }

    if (minPrice !== undefined) {
      queryBuilder = queryBuilder.gte('price_per_hour', minPrice);
    }

    if (maxPrice !== undefined) {
      queryBuilder = queryBuilder.lte('price_per_hour', maxPrice);
    }

    // Text search
    if (query) {
      queryBuilder = queryBuilder.or(
        `display_name.ilike.%${query}%,description.ilike.%${query}%,subject.ilike.%${query}%`
      );
    }

    // Sort by popularity (total_sessions) and rating
    queryBuilder = queryBuilder
      .order('total_sessions', { ascending: false })
      .order('avg_rating', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('AI tutor search error:', error);
      return [];
    }

    return (data || []) as AITutorSearchResult[];
  } catch (error) {
    console.error('Unexpected AI tutor search error:', error);
    return [];
  }
}

/**
 * Get featured AI tutors for homepage/marketplace
 */
export async function getFeaturedAITutors(limit: number = 6): Promise<AITutorSearchResult[]> {
  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from('ai_tutors')
      .select(
        `
        id,
        name,
        display_name,
        description,
        avatar_url,
        subject,
        price_per_hour,
        currency,
        status,
        subscription_status,
        avg_rating,
        total_reviews,
        total_sessions,
        total_revenue,
        created_at,
        published_at
      `
      )
      .eq('status', 'published')
      .eq('subscription_status', 'active')
      .gte('avg_rating', 4.0) // Only well-rated AI tutors
      .gte('total_sessions', 5) // Has some usage
      .order('total_sessions', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Featured AI tutors error:', error);
      return [];
    }

    return (data || []) as AITutorSearchResult[];
  } catch (error) {
    console.error('Unexpected featured AI tutors error:', error);
    return [];
  }
}
