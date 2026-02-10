/**
 * POST /api/v1/tutors/search
 * Purpose: Search for tutors with automatic referral attribution (AI agent endpoint)
 * Authentication: API key required (Bearer token)
 * Scope: tutors:search
 *
 * Use Cases:
 * - ChatGPT: "Find me a biology tutor in London and make sure I get referral credit"
 * - Claude: "Search for GCSE maths tutors and generate my referral link"
 * - Voice assistant: "Find tutors near me"
 *
 * Special Feature: Returns referral-attributed links automatically
 */

import { withApiAuth } from '@/middleware/api-auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SearchTutorsRequest {
  query?: string; // Free-text search
  subject?: string; // e.g., "mathematics", "biology"
  level?: string; // e.g., "gcse", "a-level", "university"
  location?: string; // e.g., "London, UK"
  max_price?: number; // Max hourly rate
  min_rating?: number; // Minimum rating (0-5)
  limit?: number; // Results limit (default: 10, max: 50)
  include_referral_links?: boolean; // Include attributed referral links (default: true)
}

export async function POST(request: Request) {
  return withApiAuth(
    request,
    async (authContext) => {
      const supabase = await createClient();

      // Parse request body
      let body: SearchTutorsRequest;
      try {
        body = await request.json();
      } catch (_err) {
        return NextResponse.json(
          {
            error: 'invalid_json',
            message: 'Request body must be valid JSON',
          },
          { status: 400 }
        );
      }

      const limit = Math.min(body.limit || 10, 50); // Cap at 50 results

      // Get authenticated user's referral code
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', authContext.profileId)
        .single();

      const referralCode = userProfile?.referral_code;

      // Build tutor search query
      // Note: This is a simplified search - you may want to use full-text search, vector embeddings, etc.
      let query = supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          avatar_url,
          bio,
          roles,
          location,
          metadata,
          listings:listings(
            id,
            title,
            description,
            subjects,
            price_per_hour,
            level
          )
        `
        )
        .contains('roles', ['tutor'])
        .limit(limit);

      // Apply filters
      if (body.query) {
        // Simple text search (for production, use full-text search or Algolia)
        query = query.or(
          `full_name.ilike.%${body.query}%,bio.ilike.%${body.query}%`
        );
      }

      if (body.location) {
        query = query.ilike('location', `%${body.location}%`);
      }

      const { data: tutors, error } = await query;

      if (error) {
        console.error('Tutor search error:', error);
        return NextResponse.json(
          {
            error: 'search_failed',
            message: 'Failed to search tutors',
          },
          { status: 500 }
        );
      }

      // Filter by subject/level/price (client-side for now)
      let filteredTutors = tutors || [];

      if (body.subject) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.listings?.some((listing: any) =>
            listing.subjects?.some((s: string) =>
              s.toLowerCase().includes(body.subject!.toLowerCase())
            )
          )
        );
      }

      if (body.level) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.listings?.some((listing: any) =>
            listing.level?.toLowerCase().includes(body.level!.toLowerCase())
          )
        );
      }

      if (body.max_price) {
        filteredTutors = filteredTutors.filter((tutor) =>
          tutor.listings?.some(
            (listing: any) => parseFloat(listing.price_per_hour) <= body.max_price!
          )
        );
      }

      // Format results
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tutorwise.com';
      const results = filteredTutors.map((tutor) => {
        const tutorUrl = `${baseUrl}/public-profile/${tutor.id}`;
        const referralUrl = referralCode
          ? `${baseUrl}/a/${referralCode}?redirect=${encodeURIComponent(tutorUrl)}`
          : tutorUrl;

        // Get best listing (lowest price or first available)
        const bestListing = tutor.listings?.sort(
          (a: any, b: any) =>
            parseFloat(a.price_per_hour) - parseFloat(b.price_per_hour)
        )[0];

        return {
          id: tutor.id,
          name: tutor.full_name,
          avatar: tutor.avatar_url,
          bio: tutor.bio,
          location: tutor.location,
          subjects: bestListing?.subjects || [],
          level: bestListing?.level,
          price_per_hour: bestListing?.price_per_hour,
          currency: 'GBP',
          profile_url: tutorUrl,
          ...(body.include_referral_links !== false && {
            referral_link: referralUrl,
            referral_code: referralCode,
          }),
        };
      });

      return NextResponse.json({
        success: true,
        results,
        count: results.length,
        query: {
          subject: body.subject,
          level: body.level,
          location: body.location,
          max_price: body.max_price,
        },
        ...(body.include_referral_links !== false &&
          referralCode && {
            referral_attribution: {
              code: referralCode,
              message:
                'All links include automatic referral attribution. Share these links to earn commission.',
            },
          }),
      });
    },
    {
      requiredScopes: ['tutors:search'],
    }
  );
}
