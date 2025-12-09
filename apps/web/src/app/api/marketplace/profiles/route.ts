/**
 * Marketplace Profiles API Route
 * Fetches tutor profiles for marketplace discovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { TutorProfile } from '@/types/marketplace';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supabase = await createClient();

    // Parse pagination parameters
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch tutor profiles with published listings
    // Only show profiles that have at least one published listing
    // Include subjects, levels, location_type, and hourly_rate from their listings for card display
    // Use explicit FK relationship to avoid ambiguity (profiles own listings via profile_id)
    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        bio,
        city,
        identity_verified,
        dbs_verified,
        available_free_help,
        listings!listings_profile_id_fkey!inner(id, status, subjects, levels, location_type, hourly_rate)
      `, { count: 'exact' })
      .eq('listings.status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    // Transform and aggregate subjects/levels/location_types/prices from listings
    const profiles: TutorProfile[] = (data || []).map((profile: any) => {
      // Aggregate unique subjects, levels, and location types from all published listings
      const allSubjects = new Set<string>();
      const allLevels = new Set<string>();
      const allLocationTypes = new Set<string>();
      const hourlyRates: number[] = [];

      profile.listings?.forEach((listing: any) => {
        listing.subjects?.forEach((subject: string) => allSubjects.add(subject));
        listing.levels?.forEach((level: string) => allLevels.add(level));
        if (listing.location_type) allLocationTypes.add(listing.location_type);
        if (listing.hourly_rate) hourlyRates.push(listing.hourly_rate);
      });

      // Calculate price range
      const minPrice = hourlyRates.length > 0 ? Math.min(...hourlyRates) : undefined;
      const maxPrice = hourlyRates.length > 0 ? Math.max(...hourlyRates) : undefined;

      return {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        city: profile.city,
        identity_verified: profile.identity_verified,
        dbs_verified: profile.dbs_verified,
        available_free_help: profile.available_free_help,
        listing_count: profile.listings?.length || 0,
        subjects: Array.from(allSubjects),
        levels: Array.from(allLevels),
        location_types: Array.from(allLocationTypes),
        min_hourly_rate: minPrice,
        max_hourly_rate: maxPrice,
        // TODO: Get actual ratings from reviews - using 0 until implemented
        average_rating: 0,
        review_count: 0,
      };
    });

    return NextResponse.json({
      profiles,
      total: count || 0,
    });
  } catch (error) {
    console.error('Profiles API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
