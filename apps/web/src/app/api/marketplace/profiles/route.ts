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

    // Fetch tutor profiles with completed profiles
    // Show tutors who have completed their profile (profile_completed = true)
    // Include both listings (if any) AND role_details (tutor professional data)
    // Use left joins so tutors appear even without listings
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
        profile_completed,
        listings!listings_profile_id_fkey(id, status, subjects, levels, delivery_mode, hourly_rate),
        role_details!role_details_profile_id_fkey!left(role_type, subjects, hourly_rate, qualifications, availability)
      `, { count: 'exact' })
      .contains('roles', ['tutor'])
      .eq('profile_completed', true)
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

    // Transform and aggregate subjects/levels/delivery_modes/prices
    // STRATEGY: Use role_details as primary source, listings as supplementary
    // This ensures tutors appear in marketplace even without published listings
    const profiles: TutorProfile[] = (data || []).map((profile: any) => {
      const publishedListings = profile.listings?.filter((l: any) => l.status === 'published') || [];
      const tutorRoleDetails = profile.role_details?.find((rd: any) => rd.role_type === 'tutor' || !rd.role_type);

      // Start with role_details as base (strategic default)
      const allSubjects = new Set<string>(tutorRoleDetails?.subjects || []);
      const allLevels = new Set<string>();
      const allDeliveryModes = new Set<string>();
      const hourlyRates: number[] = [];

      // Add base hourly rate from role_details
      if (tutorRoleDetails?.hourly_rate) {
        hourlyRates.push(tutorRoleDetails.hourly_rate);
      }

      // Supplement with published listings data (if any)
      publishedListings.forEach((listing: any) => {
        listing.subjects?.forEach((subject: string) => allSubjects.add(subject));
        listing.levels?.forEach((level: string) => allLevels.add(level));
        listing.delivery_mode?.forEach((mode: string) => allDeliveryModes.add(mode));
        if (listing.hourly_rate) hourlyRates.push(listing.hourly_rate);
      });

      return {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        city: profile.city,
        identity_verified: profile.identity_verified,
        dbs_verified: profile.dbs_verified,
        available_free_help: profile.available_free_help,
        listing_count: publishedListings.length,
        subjects: Array.from(allSubjects),
        levels: Array.from(allLevels),
        location_types: Array.from(allDeliveryModes),
        min_hourly_rate: hourlyRates.length > 0 ? Math.min(...hourlyRates) : undefined,
        max_hourly_rate: hourlyRates.length > 0 ? Math.max(...hourlyRates) : undefined,
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
