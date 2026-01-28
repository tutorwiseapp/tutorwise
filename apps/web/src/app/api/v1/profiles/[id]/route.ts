/**
 * GET /api/v1/profiles/:id
 * Purpose: Get public profile information (Platform API endpoint)
 * Authentication: API key required (Bearer token)
 * Scope: profiles:read
 *
 * Use Cases:
 * - Partner platform: Display Tutorwise tutor profiles on external site
 * - AI agent: "Show me this tutor's profile and qualifications"
 * - Analytics tool: Collect profile data for analysis
 * - Marketplace integration: Sync profile data
 *
 * Special Features:
 * - Returns public profile data only (respects RLS policies)
 * - Optional listings inclusion
 * - Optional CaaS score inclusion
 * - Optional performance stats
 */

import { withApiAuth } from '@/middleware/api-auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ProfileRouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, props: ProfileRouteParams) {
  const params = await props.params;
  return withApiAuth(
    request,
    async (authContext) => {
      const supabase = await createClient();
      const { searchParams } = new URL(request.url);

      // Parse query parameters
      const includeListings = searchParams.get('include_listings') === 'true';
      const includeCaasScore = searchParams.get('include_caas_score') !== 'false';
      const includeStats = searchParams.get('include_stats') === 'true';

      // Validate profile ID format (UUID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(params.id)) {
        return NextResponse.json(
          {
            error: 'invalid_profile_id',
            message: 'Profile ID must be a valid UUID',
            profile_id: params.id,
          },
          { status: 400 }
        );
      }

      // Build profile query
      let profileQuery = supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          avatar_url,
          bio,
          location,
          roles,
          referral_code,
          caas_score,
          created_at,
          metadata
        `
        )
        .eq('id', params.id)
        .single();

      const { data: profile, error: profileError } = await profileQuery;

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Not found
          return NextResponse.json(
            {
              error: 'profile_not_found',
              message: 'Profile not found',
              profile_id: params.id,
            },
            { status: 404 }
          );
        }

        console.error('Profile query error:', profileError);
        return NextResponse.json(
          {
            error: 'query_failed',
            message: 'Failed to fetch profile',
          },
          { status: 500 }
        );
      }

      // Build base URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tutorwise.com';

      // Build base response
      const response: any = {
        success: true,
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          location: profile.location,
          roles: profile.roles || [],
          referral_code: profile.referral_code,
          caas_score: includeCaasScore ? profile.caas_score : undefined,
          created_at: profile.created_at,
          profile_url: `${baseUrl}/public-profile/${profile.id}`,
        },
      };

      // Optionally include listings
      if (includeListings) {
        const { data: listings } = await supabase
          .from('listings')
          .select(
            `
            id,
            title,
            description,
            subjects,
            level,
            price_per_hour,
            is_active
          `
          )
          .eq('profile_id', params.id)
          .eq('is_active', true);

        response.profile.listings = (listings || []).map((listing) => ({
          id: listing.id,
          title: listing.title,
          description: listing.description,
          subjects: listing.subjects || [],
          level: listing.level,
          price_per_hour: parseFloat(listing.price_per_hour || '0'),
          currency: 'GBP',
          is_active: listing.is_active,
        }));
      }

      // Optionally include performance stats (tutors only)
      if (includeStats && profile.roles?.includes('tutor')) {
        // Fetch performance stats
        const { data: perfStats } = await supabase.rpc('get_performance_stats', {
          user_id: params.id,
        });

        const { data: networkStats } = await supabase.rpc('get_network_stats', {
          user_id: params.id,
        });

        const { data: digitalStats } = await supabase.rpc('get_digital_stats', {
          user_id: params.id,
        });

        // Count reviews
        const { count: reviewCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', params.id);

        response.profile.stats = {
          performance: perfStats?.[0] || null,
          network: networkStats?.[0] || null,
          digital: digitalStats?.[0] || null,
          total_reviews: reviewCount || 0,
        };
      }

      return NextResponse.json(response);
    },
    {
      requiredScopes: ['profiles:read'],
    }
  );
}
