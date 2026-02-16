/**
 * Marketplace Organisations API Route
 *
 * Fetches public organisations for marketplace.
 * Supports structured filters (subjects, city, category) and
 * semantic search via search_organisations_hybrid RPC.
 */

import { createClient } from '@/utils/supabase/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateEmbedding } from '@/lib/services/embeddings';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const subjects = searchParams.get('subjects')?.split(',');
  const query = searchParams.get('query') || '';

  // If query is present, use hybrid semantic search
  if (query) {
    return await hybridOrganisationSearch(query, { subjects, city, category }, limit, offset);
  }

  // Structured-only path (backward compatible)
  const supabase = await createClient();

  let dbQuery = supabase
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

  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }

  if (city) {
    dbQuery = dbQuery.eq('location_city', city);
  }

  if (subjects && subjects.length > 0) {
    dbQuery = dbQuery.overlaps('subjects_offered', subjects);
  }

  dbQuery = dbQuery
    .order('caas_score', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: organisations, error, count } = await dbQuery;

  if (error) {
    console.error('Failed to fetch organisations:', error);
    return NextResponse.json({ error: 'Failed to fetch organisations' }, { status: 500 });
  }

  const organisationsWithStats = await fetchOrgStats(supabase, organisations || []);

  return NextResponse.json({
    organisations: organisationsWithStats,
    total: count || 0,
  });
}

// =============================================================================
// Hybrid Organisation Search
// =============================================================================

async function hybridOrganisationSearch(
  query: string,
  filters: { subjects?: string[]; city?: string | null; category?: string | null },
  limit: number,
  offset: number
) {
  const supabase = createServiceRoleClient();

  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch (err) {
    console.error('Failed to generate organisation query embedding:', err);
  }

  const embeddingParam = queryEmbedding ? `[${queryEmbedding.join(',')}]` : null;

  const { data, error } = await supabase.rpc('search_organisations_hybrid', {
    query_embedding: embeddingParam,
    filter_subjects: filters.subjects?.length ? filters.subjects : null,
    filter_city: filters.city || null,
    filter_category: filters.category || null,
    match_count: limit,
    match_offset: offset,
    match_threshold: 0.3,
  });

  if (error) {
    console.error('Organisation hybrid search error:', error);
    return NextResponse.json({ error: 'Failed to search organisations' }, { status: 500 });
  }

  return NextResponse.json({
    organisations: data || [],
    total: data?.length || 0,
  });
}

// =============================================================================
// Helpers
// =============================================================================

async function fetchOrgStats(supabase: any, organisations: any[]) {
  return Promise.all(
    organisations.map(async (org) => {
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
}
