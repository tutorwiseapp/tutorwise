/**
 * Marketplace Profiles API Route
 *
 * Fetches tutor profiles for marketplace discovery.
 * Supports structured filters (subjects, levels, city) and
 * semantic search via search_profiles_hybrid RPC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/lib/services/embeddings';
import type { TutorProfile } from '@/types/marketplace';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Search/filter params
    const query = searchParams.get('query') || '';
    const subjects = searchParams.get('subjects')?.split(',').map(s => s.trim());
    const levels = searchParams.get('levels')?.split(',').map(l => l.trim());
    const city = searchParams.get('city') || searchParams.get('location_city') || '';

    // If query is present, use hybrid semantic search
    if (query) {
      return await hybridProfileSearch(query, { subjects, levels, city }, limit, offset);
    }

    // Structured-only path (backward compatible)
    const supabase = await createClient();

    let dbQuery = supabase
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
      .eq('profile_completed', true);

    // Apply structured filters
    if (city) {
      dbQuery = dbQuery.ilike('city', city);
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    // Transform profiles, applying client-side subject/level filtering
    let profiles = transformProfiles(data || []);

    // Filter by subjects if specified (role_details + listings subjects)
    if (subjects && subjects.length > 0) {
      profiles = profiles.filter(p =>
        p.subjects?.some(s => subjects.some(fs => s.toLowerCase().includes(fs.toLowerCase())))
      );
    }

    // Filter by levels if specified
    if (levels && levels.length > 0) {
      profiles = profiles.filter(p =>
        p.levels?.some(l => levels.some(fl => l.toLowerCase().includes(fl.toLowerCase())))
      );
    }

    return NextResponse.json({ profiles, total: count || 0 });
  } catch (error) {
    console.error('Profiles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// Hybrid Profile Search
// =============================================================================

async function hybridProfileSearch(
  query: string,
  filters: { subjects?: string[]; levels?: string[]; city?: string },
  limit: number,
  offset: number
) {
  const supabase = createServiceRoleClient();

  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch (err) {
    console.error('Failed to generate profile query embedding:', err);
  }

  const embeddingParam = queryEmbedding ? `[${queryEmbedding.join(',')}]` : null;

  const { data, error } = await supabase.rpc('search_profiles_hybrid', {
    query_embedding: embeddingParam,
    filter_subjects: filters.subjects?.length ? filters.subjects : null,
    filter_levels: filters.levels?.length ? filters.levels : null,
    filter_city: filters.city || null,
    match_count: limit,
    match_offset: offset,
    match_threshold: 0.3,
  });

  if (error) {
    console.error('Profile hybrid search error:', error);
    return NextResponse.json({ error: 'Failed to search profiles' }, { status: 500 });
  }

  return NextResponse.json({
    profiles: data || [],
    total: data?.length || 0,
  });
}

// =============================================================================
// Transform Helpers
// =============================================================================

function transformProfiles(data: any[]): TutorProfile[] {
  return data.map((profile: any) => {
    const publishedListings = profile.listings?.filter((l: any) => l.status === 'published') || [];
    const tutorRoleDetails = profile.role_details?.find((rd: any) => rd.role_type === 'tutor' || !rd.role_type);

    const allSubjects = new Set<string>(tutorRoleDetails?.subjects || []);
    const allLevels = new Set<string>();
    const allDeliveryModes = new Set<string>();
    const hourlyRates: number[] = [];

    if (tutorRoleDetails?.hourly_rate) {
      hourlyRates.push(tutorRoleDetails.hourly_rate);
    }

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
      delivery_modes: Array.from(allDeliveryModes),
      min_hourly_rate: hourlyRates.length > 0 ? Math.min(...hourlyRates) : undefined,
      max_hourly_rate: hourlyRates.length > 0 ? Math.max(...hourlyRates) : undefined,
      average_rating: 0,
      review_count: 0,
    };
  });
}
