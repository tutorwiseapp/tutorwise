/**
 * Filename: apps/web/src/app/api/marketplace/match-score/route.ts
 * Purpose: API endpoint for calculating match scores between users and listings
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Match Score Display
 *
 * Usage:
 * POST /api/marketplace/match-score
 * Body: {
 *   userPreferences: UserPreferences,
 *   listingIds?: string[],  // Calculate for specific listings
 *   filters?: ListingFilters // Or calculate for all listings matching filters
 * }
 *
 * Response: {
 *   listings: Array<Listing & { matchScore: MatchScore }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { calculateMatchScores, sortByMatchScore } from '@/lib/services/matchScoring';
import type { UserPreferences, ListingForMatch } from '@/lib/services/matchScoring';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPreferences, listingIds, filters, limit = 20 } = body;

    if (!userPreferences) {
      return NextResponse.json(
        { error: 'User preferences are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase
      .from('listings')
      .select('*, profile:profiles(id, full_name, avatar_url, active_role, identity_verified, dbs_verified)')
      .eq('status', 'published');

    // Filter by specific listing IDs if provided
    if (listingIds && listingIds.length > 0) {
      query = query.in('id', listingIds);
    }

    // Apply additional filters
    if (filters) {
      if (filters.subjects && filters.subjects.length > 0) {
        query = query.overlaps('subjects', filters.subjects);
      }

      if (filters.levels && filters.levels.length > 0) {
        query = query.overlaps('levels', filters.levels);
      }

      if (filters.delivery_modes && filters.delivery_modes.length > 0) {
        query = query.overlaps('delivery_mode', filters.delivery_modes);
      }

      if (filters.location_city) {
        query = query.eq('location_city', filters.location_city);
      }

      if (filters.min_price) {
        query = query.gte('hourly_rate', filters.min_price);
      }

      if (filters.max_price) {
        query = query.lte('hourly_rate', filters.max_price);
      }

      if (filters.free_trial_only) {
        query = query.eq('free_trial', true);
      }
    }

    // Fetch listings
    const { data: listings, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ listings: [] });
    }

    // Calculate match scores
    const listingsWithScores = calculateMatchScores(
      userPreferences as UserPreferences,
      listings as ListingForMatch[]
    );

    // Sort by match score
    const sortedListings = sortByMatchScore(listingsWithScores);

    // Apply limit
    const limitedListings = sortedListings.slice(0, limit);

    return NextResponse.json({
      listings: limitedListings,
      total: listings.length,
    });

  } catch (error) {
    console.error('Match score error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate match scores' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to calculate match score for a single listing
 * GET /api/marketplace/match-score?listingId=xxx&userPreferences={...}
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const listingId = searchParams.get('listingId');
    const userPrefsParam = searchParams.get('userPreferences');

    if (!listingId || !userPrefsParam) {
      return NextResponse.json(
        { error: 'listingId and userPreferences are required' },
        { status: 400 }
      );
    }

    const userPreferences = JSON.parse(userPrefsParam);
    const supabase = createServiceRoleClient();

    // Fetch the specific listing
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*, profile:profiles(id, full_name, avatar_url, active_role, identity_verified, dbs_verified)')
      .eq('id', listingId)
      .eq('status', 'published')
      .single();

    if (error || !listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      );
    }

    // Calculate match score
    const listingsWithScores = calculateMatchScores(
      userPreferences as UserPreferences,
      [listing as ListingForMatch]
    );

    return NextResponse.json({
      listing: listingsWithScores[0],
    });

  } catch (error) {
    console.error('Match score error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate match score' },
      { status: 500 }
    );
  }
}
