/**
 * Filename: /api/marketplace/organisations/route.ts
 * Purpose: Fetch public organisations for marketplace
 * Created: 2026-01-03
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const category = searchParams.get('category'); // Optional category filter
  const city = searchParams.get('city'); // Optional city filter
  const subjects = searchParams.get('subjects')?.split(','); // Optional subjects filter

  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('connection_groups')
    .select(`
      id,
      name,
      slug,
      tagline,
      avatar_url,
      location_city,
      location_country,
      subjects_offered,
      caas_score,
      category
    `, { count: 'exact' })
    .eq('type', 'organisation')
    .eq('public_visible', true);

  // Apply filters
  if (category) {
    query = query.eq('category', category);
  }

  if (city) {
    query = query.eq('location_city', city);
  }

  if (subjects && subjects.length > 0) {
    query = query.overlaps('subjects_offered', subjects);
  }

  // Sort and paginate
  query = query
    .order('caas_score', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: organisations, error, count } = await query;

  if (error) {
    console.error('Failed to fetch organisations:', error);
    return NextResponse.json({ error: 'Failed to fetch organisations' }, { status: 500 });
  }

  // Fetch stats for each organisation
  const organisationsWithStats = await Promise.all(
    (organisations || []).map(async (org) => {
      const { data: stats } = await supabase.rpc('get_organisation_public_stats', {
        p_org_id: org.id,
      });

      return {
        ...org,
        total_tutors: stats?.[0]?.total_tutors || 0,
        avg_rating: stats?.[0]?.avg_rating ? Number(stats[0].avg_rating) : null,
        total_reviews: stats?.[0]?.total_reviews || 0,
      };
    })
  );

  return NextResponse.json({
    organisations: organisationsWithStats,
    total: count || 0,
  });
}
