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
        listings!listings_profile_id_fkey!inner(id, status)
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

    // Transform and count listings per profile
    const profiles: TutorProfile[] = (data || []).map((profile: any) => ({
      id: profile.id,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      city: profile.city,
      identity_verified: profile.identity_verified,
      dbs_verified: profile.dbs_verified,
      available_free_help: profile.available_free_help,
      listing_count: profile.listings?.length || 0,
      // TODO: Get actual ratings from reviews
      average_rating: 4.8,
      review_count: 0,
    }));

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
