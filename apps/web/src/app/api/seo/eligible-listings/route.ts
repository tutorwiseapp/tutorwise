/**
 * Filename: src/app/api/seo/eligible-listings/route.ts
 * Purpose: API endpoint for SEO-eligible listings
 * Created: 2025-12-31
 * Phase: Trust-First SEO - API Access
 *
 * Provides programmatic access to listings from high-trust providers for:
 * - External integrations
 * - Partner sites
 * - Content syndication
 * - Analytics dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface EligibleListing {
  id: string;
  title: string;
  slug: string;
  description?: string;
  hourly_rate?: number;
  service_type?: string;
  subjects?: string[];
  listing_url: string;
  provider: {
    id: string;
    name: string;
    seo_eligibility_score: number;
  };
  updated_at: string;
}

/**
 * GET /api/seo/eligible-listings
 * Returns list of listings from SEO-eligible providers (score >= 75)
 *
 * Query Parameters:
 * - limit: Number of listings to return (default: 50, max: 500)
 * - offset: Pagination offset (default: 0)
 * - minScore: Minimum provider eligibility score (default: 75, max: 100)
 * - serviceType: Filter by service type
 * - subject: Filter by subject
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters with validation
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const minScore = Math.min(parseInt(searchParams.get('minScore') || '75', 10), 100);
    const serviceType = searchParams.get('serviceType');
    const subject = searchParams.get('subject');

    // Build query
    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        slug,
        description,
        hourly_rate,
        service_type,
        subjects,
        updated_at,
        profiles!inner (
          id,
          full_name,
          seo_eligible,
          seo_eligibility_score
        )
      `)
      .eq('status', 'active')
      .eq('profiles.seo_eligible', true)
      .gte('profiles.seo_eligibility_score', minScore)
      .not('slug', 'is', null)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (serviceType) {
      query = query.eq('service_type', serviceType);
    }
    if (subject) {
      query = query.contains('subjects', [subject]);
    }

    const { data: listings, error, count } = await query;

    if (error) {
      console.error('Error fetching eligible listings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch eligible listings', details: error.message },
        { status: 500 }
      );
    }

    // Format response
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutorwise.io';
    const formattedListings: EligibleListing[] = (listings || []).map((listing) => {
      const provider = listing.profiles as any;
      return {
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        description: listing.description || undefined,
        hourly_rate: listing.hourly_rate || undefined,
        service_type: listing.service_type || undefined,
        subjects: listing.subjects || undefined,
        listing_url: `${baseUrl}/listings/${listing.id}/${listing.slug}`,
        provider: {
          id: provider.id,
          name: provider.full_name,
          seo_eligibility_score: provider.seo_eligibility_score,
        },
        updated_at: listing.updated_at,
      };
    });

    return NextResponse.json(
      {
        listings: formattedListings,
        pagination: {
          limit,
          offset,
          total: count || formattedListings.length,
          hasMore: formattedListings.length === limit,
        },
        filters: {
          minScore,
          serviceType: serviceType || null,
          subject: subject || null,
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
