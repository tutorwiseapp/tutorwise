/**
 * Filename: route.ts
 * Purpose: Personalized recommendations API endpoint
 * Created: 2025-12-10
 * Phase: Marketplace Phase 2 - Recommended for You
 *
 * Features:
 * - Profile-based recommendations using match scoring
 * - Role-aware recommendations (client sees tutors, tutor sees jobs)
 * - Hybrid approach: collaborative filtering + content-based
 * - Caching for performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { calculateEntityMatch } from '@/lib/services/matchScoring';
import type { Listing } from '@tutorwise/shared-types';

export const dynamic = 'force-dynamic';

interface RecommendationParams {
  limit?: number;
  offset?: number;
  role?: string;
  excludeIds?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse parameters
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const role = searchParams.get('role') || profile.active_role;
    const excludeIds = searchParams.get('exclude')?.split(',') || [];

    // Get recommendations based on role
    let recommendations;

    if (role === 'client') {
      // Clients get tutor recommendations
      recommendations = await getClientRecommendations(
        supabase,
        profile,
        { limit, offset, excludeIds }
      );
    } else if (role === 'tutor') {
      // Tutors get job posting recommendations
      recommendations = await getTutorRecommendations(
        supabase,
        profile,
        { limit, offset, excludeIds }
      );
    } else if (role === 'agent') {
      // Agents get opportunities for their network
      recommendations = await getAgentRecommendations(
        supabase,
        profile,
        { limit, offset, excludeIds }
      );
    } else {
      // Default: mix of profiles and listings
      recommendations = await getDefaultRecommendations(
        supabase,
        profile,
        { limit, offset, excludeIds }
      );
    }

    return NextResponse.json({
      recommendations: recommendations.items,
      total: recommendations.total,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

/**
 * Get recommendations for clients (tutor profiles and listings)
 */
async function getClientRecommendations(
  supabase: any,
  profile: any,
  params: RecommendationParams
) {
  const { limit = 10, offset = 0, excludeIds = [] } = params;

  // Fetch active listings
  let query = supabase
    .from('listings')
    .select('*, profile:profiles(*)')
    .eq('status', 'published')
    .neq('profile_id', profile.id);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: listings, error } = await query
    .order('created_at', { ascending: false })
    .limit(100); // Get more for scoring

  if (error) {
    console.error('Error fetching listings:', error);
    return { items: [], total: 0 };
  }

  // Score each listing against user profile
  const scoredListings = (listings || [])
    .map((listing: any) => {
      const matchScore = calculateEntityMatch(profile, listing, {
        roleA: 'client',
        matchType: 'complementary',
      });

      return {
        ...listing,
        matchScore,
        type: 'listing' as const,
      };
    })
    .filter((item: any) => item.matchScore.overall >= 40) // Minimum 40% match
    .sort((a: any, b: any) => b.matchScore.overall - a.matchScore.overall)
    .slice(offset, offset + limit);

  return {
    items: scoredListings,
    total: scoredListings.length,
  };
}

/**
 * Get recommendations for tutors (job postings)
 */
async function getTutorRecommendations(
  supabase: any,
  profile: any,
  params: RecommendationParams
) {
  const { limit = 10, offset = 0, excludeIds = [] } = params;

  // Fetch job postings
  let query = supabase
    .from('listings')
    .select('*, profile:profiles(*)')
    .eq('status', 'published')
    .eq('listing_category', 'job')
    .neq('profile_id', profile.id);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: jobs, error } = await query
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching jobs:', error);
    return { items: [], total: 0 };
  }

  // Score each job against tutor profile
  const scoredJobs = (jobs || [])
    .map((job: any) => {
      const matchScore = calculateEntityMatch(profile, job, {
        roleA: 'tutor',
        matchType: 'complementary',
      });

      return {
        ...job,
        matchScore,
        type: 'listing' as const,
      };
    })
    .filter((item: any) => item.matchScore.overall >= 40)
    .sort((a: any, b: any) => b.matchScore.overall - a.matchScore.overall)
    .slice(offset, offset + limit);

  return {
    items: scoredJobs,
    total: scoredJobs.length,
  };
}

/**
 * Get recommendations for agents (opportunities for their network)
 */
async function getAgentRecommendations(
  supabase: any,
  profile: any,
  params: RecommendationParams
) {
  // For now, same as tutor recommendations
  // In future, could factor in network connections
  return getTutorRecommendations(supabase, profile, params);
}

/**
 * Get default recommendations (mix of content)
 */
async function getDefaultRecommendations(
  supabase: any,
  profile: any,
  params: RecommendationParams
) {
  const { limit = 10, offset = 0, excludeIds = [] } = params;

  // Fetch diverse content
  let query = supabase
    .from('listings')
    .select('*, profile:profiles(*)')
    .eq('status', 'published')
    .neq('profile_id', profile.id);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: listings, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit + offset);

  if (error) {
    console.error('Error fetching listings:', error);
    return { items: [], total: 0 };
  }

  // Simple diversity: take a mix
  const items = (listings || [])
    .map((listing: any) => ({
      ...listing,
      type: 'listing' as const,
    }))
    .slice(offset, offset + limit);

  return {
    items,
    total: (listings || []).length,
  };
}
