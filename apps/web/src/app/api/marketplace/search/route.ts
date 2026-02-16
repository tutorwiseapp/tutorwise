/**
 * Marketplace Search API Route
 *
 * Hybrid search: structured SQL filters + semantic vector search via pgvector RPC.
 * When a `query` param is present, generates a Gemini embedding and calls
 * search_listings_hybrid / search_profiles_hybrid / search_organisations_hybrid RPCs.
 * Without a query, falls back to structured-only search (backward compatible).
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@/lib/api/listings';
import { generateEmbedding } from '@/lib/services/embeddings';
import { createServiceRoleClient } from '@/utils/supabase/server';
import type { ListingSearchParams } from '@tutorwise/shared-types';

interface HybridSearchResult {
  listings: any[];
  profiles: any[];
  organisations: any[];
  total: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse common filter params
    const filters = parseFilters(searchParams);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const query = searchParams.get('query') || searchParams.get('search') || '';

    // Sorting
    const sortField = searchParams.get('sort_field');
    const sortOrder = searchParams.get('sort_order') as 'asc' | 'desc' | null;

    if (query) {
      // Hybrid path: structured filters + semantic vector search
      const result = await hybridSearch(query, filters, limit, offset);
      return NextResponse.json(result, { headers: noCacheHeaders() });
    }

    // Structured-only path (backward compatible)
    const searchParams2: ListingSearchParams = {
      filters,
      limit,
      offset,
      ...(sortField ? { sort: { field: sortField as any, order: sortOrder || 'desc' } } : {}),
    };

    const result = await searchListings(searchParams2);
    return NextResponse.json(result, { headers: noCacheHeaders() });
  } catch (error) {
    console.error('Marketplace search error:', error);
    return NextResponse.json({ error: 'Failed to search listings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, sort, limit = 20, offset = 0, query, search } = body;
    const searchQuery = query || search || '';

    if (searchQuery) {
      const result = await hybridSearch(searchQuery, filters || {}, limit, offset);
      return NextResponse.json(result, { headers: noCacheHeaders() });
    }

    // Structured-only
    const searchParams: ListingSearchParams = { filters: filters || {}, sort, limit, offset };
    const result = await searchListings(searchParams);
    return NextResponse.json(result, { headers: noCacheHeaders() });
  } catch (error) {
    console.error('Marketplace search error:', error);
    return NextResponse.json({ error: 'Failed to search listings' }, { status: 500 });
  }
}

// =============================================================================
// Hybrid Search
// =============================================================================

async function hybridSearch(
  query: string,
  filters: any,
  limit: number,
  offset: number
): Promise<HybridSearchResult> {
  const supabase = createServiceRoleClient();

  // Generate query embedding via Gemini
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch (err) {
    console.error('Failed to generate query embedding, falling back to structured-only:', err);
  }

  // Build RPC params
  const embeddingParam = queryEmbedding ? `[${queryEmbedding.join(',')}]` : null;

  // Run all three searches in parallel
  const [listingsResult, profilesResult, organisationsResult] = await Promise.all([
    // --- Listings hybrid search ---
    supabase.rpc('search_listings_hybrid', {
      query_embedding: embeddingParam,
      filter_subjects: filters.subjects?.length ? filters.subjects : null,
      filter_levels: filters.levels?.length ? filters.levels : null,
      filter_location_city: filters.location_city || null,
      filter_delivery_modes: filters.delivery_modes?.length ? filters.delivery_modes : null,
      filter_min_price: filters.min_price || null,
      filter_max_price: filters.max_price || null,
      filter_free_trial: filters.free_trial_only || null,
      filter_listing_type: filters.listing_type || null,
      filter_search_text: query || null,
      match_count: limit,
      match_offset: offset,
      match_threshold: 0.3,
    }),

    // --- Profiles hybrid search ---
    supabase.rpc('search_profiles_hybrid', {
      query_embedding: embeddingParam,
      filter_subjects: filters.subjects?.length ? filters.subjects : null,
      filter_levels: filters.levels?.length ? filters.levels : null,
      filter_city: filters.location_city || null,
      match_count: Math.min(limit, 10),
      match_offset: 0,
      match_threshold: 0.3,
    }),

    // --- Organisations hybrid search ---
    supabase.rpc('search_organisations_hybrid', {
      query_embedding: embeddingParam,
      filter_subjects: filters.subjects?.length ? filters.subjects : null,
      filter_city: filters.location_city || null,
      filter_category: filters.listing_type || null,
      match_count: Math.min(limit, 5),
      match_offset: 0,
      match_threshold: 0.3,
    }),
  ]);

  if (listingsResult.error) {
    console.error('Listings hybrid search error:', listingsResult.error);
  }
  if (profilesResult.error) {
    console.error('Profiles hybrid search error:', profilesResult.error);
  }
  if (organisationsResult.error) {
    console.error('Organisations hybrid search error:', organisationsResult.error);
  }

  const listings = listingsResult.data || [];
  const profiles = profilesResult.data || [];
  const organisations = organisationsResult.data || [];

  return {
    listings,
    profiles,
    organisations,
    total: listings.length + profiles.length + organisations.length,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function parseFilters(searchParams: URLSearchParams): any {
  const filters: any = {};

  const category = searchParams.get('category') || searchParams.get('listing_type');
  if (category) {
    filters.listing_type = category;
  }

  const subjects = searchParams.get('subjects');
  if (subjects) {
    filters.subjects = subjects.split(',').map(s => s.trim());
  }

  const levels = searchParams.get('levels');
  if (levels) {
    filters.levels = levels.split(',').map(l => l.trim());
  }

  const deliveryModes = searchParams.get('delivery_modes');
  if (deliveryModes) {
    filters.delivery_modes = deliveryModes.split(',').map(m => m.trim());
  }

  const locationCity = searchParams.get('location_city');
  if (locationCity) {
    filters.location_city = locationCity;
  }

  const minPrice = searchParams.get('min_price');
  if (minPrice) {
    filters.min_price = parseFloat(minPrice);
  }

  const maxPrice = searchParams.get('max_price');
  if (maxPrice) {
    filters.max_price = parseFloat(maxPrice);
  }

  const freeTrialOnly = searchParams.get('free_trial_only');
  if (freeTrialOnly === 'true') {
    filters.free_trial_only = true;
  }

  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  return filters;
}

function noCacheHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}
