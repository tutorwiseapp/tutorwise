/**
 * Marketplace Search API Route
 * Handles searching and filtering of tutor listings
 * Updated: 2025-12-10 - Added semantic search support (Phase 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchListings } from '@/lib/api/listings';
import { generateEmbedding } from '@/lib/services/embeddings';
import { createServiceRoleClient } from '@/utils/supabase/server';
import type { ListingSearchParams } from '@tutorwise/shared-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const filters: ListingSearchParams = {
      filters: {},
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    // Listing category filter (v5.0)
    const category = searchParams.get('category');
    if (category && ['session', 'course', 'job'].includes(category)) {
      filters.filters!.listing_category = category as 'session' | 'course' | 'job';
    }

    // Subjects filter
    const subjects = searchParams.get('subjects');
    if (subjects) {
      filters.filters!.subjects = subjects.split(',').map(s => s.trim());
    }

    // Levels filter
    const levels = searchParams.get('levels');
    if (levels) {
      filters.filters!.levels = levels.split(',').map(l => l.trim());
    }

    // Delivery modes filter
    const deliveryModes = searchParams.get('delivery_modes');
    if (deliveryModes) {
      filters.filters!.delivery_modes = deliveryModes.split(',').map(m => m.trim());
    }

    // Location city filter
    const locationCity = searchParams.get('location_city');
    if (locationCity) {
      filters.filters!.location_city = locationCity;
    }

    // Price range filters
    const minPrice = searchParams.get('min_price');
    if (minPrice) {
      filters.filters!.min_price = parseFloat(minPrice);
    }

    const maxPrice = searchParams.get('max_price');
    if (maxPrice) {
      filters.filters!.max_price = parseFloat(maxPrice);
    }

    // Free trial filter
    const freeTrialOnly = searchParams.get('free_trial_only');
    if (freeTrialOnly === 'true') {
      filters.filters!.free_trial_only = true;
    }

    // Search text
    const search = searchParams.get('search');
    if (search) {
      filters.filters!.search = search;
    }

    // Semantic search mode (Phase 1)
    const useSemanticSearch = searchParams.get('semantic') === 'true';

    // Sorting
    const sortField = searchParams.get('sort_field');
    const sortOrder = searchParams.get('sort_order');
    if (sortField) {
      filters.sort = {
        field: sortField as any,
        order: (sortOrder as 'asc' | 'desc') || 'desc',
      };
    }

    // Execute search (semantic or traditional)
    let result;
    if (useSemanticSearch && search) {
      // Phase 1: Semantic search using embeddings
      result = await searchListingsSemantic(search, filters);
    } else {
      // Traditional filter-based search
      result = await searchListings(filters);
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Marketplace search error:', error);
    return NextResponse.json(
      { error: 'Failed to search listings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, sort, limit, offset, semantic, search } = body;

    const searchParams: ListingSearchParams = {
      filters: filters || {},
      sort,
      limit: limit || 20,
      offset: offset || 0,
    };

    // Execute search (semantic or traditional)
    let result;
    if (semantic && search) {
      result = await searchListingsSemantic(search, searchParams);
    } else {
      result = await searchListings(searchParams);
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Marketplace search error:', error);
    return NextResponse.json(
      { error: 'Failed to search listings' },
      { status: 500 }
    );
  }
}

/**
 * Semantic search function using embeddings (Phase 1)
 * Combines vector similarity with traditional filters
 */
async function searchListingsSemantic(query: string, params: ListingSearchParams) {
  try {
    const supabase = createServiceRoleClient();

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Build filter conditions
    const { filters = {}, limit = 20, offset = 0 } = params;

    // Start with base query
    let dbQuery = supabase
      .from('listings')
      .select('*, profile:profiles(id, full_name, avatar_url, active_role, identity_verified, dbs_verified)', { count: 'exact' })
      .eq('status', 'published')
      .not('embedding', 'is', null);

    // Apply filters
    if (filters.subjects && filters.subjects.length > 0) {
      dbQuery = dbQuery.overlaps('subjects', filters.subjects);
    }

    if (filters.levels && filters.levels.length > 0) {
      dbQuery = dbQuery.overlaps('levels', filters.levels);
    }

    if (filters.delivery_modes && filters.delivery_modes.length > 0) {
      dbQuery = dbQuery.overlaps('delivery_mode', filters.delivery_modes);
    }

    if (filters.location_city) {
      dbQuery = dbQuery.eq('location_city', filters.location_city);
    }

    if (filters.min_price) {
      dbQuery = dbQuery.gte('hourly_rate', filters.min_price);
    }

    if (filters.max_price) {
      dbQuery = dbQuery.lte('hourly_rate', filters.max_price);
    }

    if (filters.free_trial_only) {
      dbQuery = dbQuery.eq('free_trial', true);
    }

    // Execute query to get filtered results
    const { data: listings, error, count } = await dbQuery;

    if (error) {
      console.error('Semantic search error:', error);
      throw error;
    }

    if (!listings || listings.length === 0) {
      return { listings: [], total: 0 };
    }

    // Calculate similarity scores for each listing
    const listingsWithScores = listings.map((listing: any) => {
      if (!listing.embedding) {
        return { ...listing, similarity: 0 };
      }

      // Parse embedding (stored as JSON array)
      const listingEmbedding = JSON.parse(listing.embedding);

      // Calculate cosine similarity (1 - cosine distance)
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < queryEmbedding.length; i++) {
        dotProduct += queryEmbedding[i] * listingEmbedding[i];
        normA += queryEmbedding[i] * queryEmbedding[i];
        normB += listingEmbedding[i] * listingEmbedding[i];
      }

      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

      return { ...listing, similarity };
    });

    // Sort by similarity score (descending)
    listingsWithScores.sort((a, b) => b.similarity - a.similarity);

    // Apply pagination
    const paginatedListings = listingsWithScores.slice(offset, offset + limit);

    return {
      listings: paginatedListings,
      total: count || 0,
    };

  } catch (error) {
    console.error('Semantic search error:', error);
    throw error;
  }
}
