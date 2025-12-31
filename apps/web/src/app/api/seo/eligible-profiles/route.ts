/**
 * Filename: src/app/api/seo/eligible-profiles/route.ts
 * Purpose: API endpoint for SEO-eligible profiles
 * Created: 2025-12-31
 * Phase: Trust-First SEO - API Access
 *
 * Provides programmatic access to high-trust profiles for:
 * - External integrations
 * - Partner sites
 * - Content syndication
 * - Analytics dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface EligibleProfile {
  id: string;
  full_name: string;
  slug: string;
  role: string;
  city?: string;
  bio?: string;
  profile_picture_url?: string;
  seo_eligibility_score: number;
  seo_eligible: boolean;
  profile_url: string;
  total_referrals_sent?: number;
  updated_at: string;
}

/**
 * GET /api/seo/eligible-profiles
 * Returns list of SEO-eligible profiles (score >= 75)
 *
 * Query Parameters:
 * - limit: Number of profiles to return (default: 50, max: 500)
 * - offset: Pagination offset (default: 0)
 * - minScore: Minimum eligibility score (default: 75, max: 100)
 * - role: Filter by role (tutor, agent, client)
 * - city: Filter by city
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters with validation
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const minScore = Math.min(parseInt(searchParams.get('minScore') || '75', 10), 100);
    const role = searchParams.get('role');
    const city = searchParams.get('city');

    // Build query
    let query = supabase
      .from('profiles')
      .select('id, full_name, slug, role, city, bio, profile_picture_url, seo_eligibility_score, seo_eligible, total_referrals_sent, updated_at')
      .eq('seo_eligible', true)
      .gte('seo_eligibility_score', minScore)
      .not('slug', 'is', null)
      .order('seo_eligibility_score', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Error fetching eligible profiles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch eligible profiles', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
    const formattedProfiles: EligibleProfile[] = (profiles || []).map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      slug: profile.slug,
      role: profile.role,
      city: profile.city || undefined,
      bio: profile.bio || undefined,
      profile_picture_url: profile.profile_picture_url || undefined,
      seo_eligibility_score: profile.seo_eligibility_score,
      seo_eligible: profile.seo_eligible,
      profile_url: `${baseUrl}/public-profile/${profile.id}/${profile.slug}`,
      total_referrals_sent: profile.total_referrals_sent || undefined,
      updated_at: profile.updated_at,
    }));

    return NextResponse.json(
      {
        profiles: formattedProfiles,
        pagination: {
          limit,
          offset,
          total: count || formattedProfiles.length,
          hasMore: formattedProfiles.length === limit,
        },
        filters: {
          minScore,
          role: role || null,
          city: city || null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
