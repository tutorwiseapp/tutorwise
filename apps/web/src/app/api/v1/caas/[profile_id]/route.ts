/**
 * GET /api/v1/caas/:profile_id
 * Purpose: Get CaaS (Credibility as a Service) score for a user (Platform API endpoint)
 * Authentication: API key required (Bearer token)
 * Scope: caas:read
 *
 * Use Cases:
 * - Third-party marketplace: Verify tutor credibility before listing
 * - Analytics dashboard: Display credibility metrics
 * - AI agent: "What's the CaaS score for this tutor?"
 * - Partner platform: Show credibility badges
 *
 * Special Features:
 * - Returns total score + detailed breakdown
 * - Supports multiple role types (TUTOR, CLIENT, AGENT, STUDENT)
 * - Optional detailed stats (performance, network, digital)
 */

import { withApiAuth } from '@/middleware/api-auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CaaSRouteParams {
  params: Promise<{
    profile_id: string;
  }>;
}

export async function GET(request: Request, props: CaaSRouteParams) {
  const params = await props.params;
  return withApiAuth(
    request,
    async (authContext) => {
      const supabase = await createClient();
      const { searchParams } = new URL(request.url);

      // Parse query parameters
      const roleType = (searchParams.get('role_type') || 'TUTOR').toUpperCase();
      const includeBreakdown = searchParams.get('include_breakdown') !== 'false';

      // Validate profile_id format (UUID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(params.profile_id)) {
        return NextResponse.json(
          {
            error: 'invalid_profile_id',
            message: 'profile_id must be a valid UUID',
            profile_id: params.profile_id,
          },
          { status: 400 }
        );
      }

      // Validate role_type
      const validRoles = ['TUTOR', 'CLIENT', 'AGENT', 'STUDENT'];
      if (!validRoles.includes(roleType)) {
        return NextResponse.json(
          {
            error: 'invalid_role_type',
            message: `role_type must be one of: ${validRoles.join(', ')}`,
            provided: roleType,
          },
          { status: 400 }
        );
      }

      // Query CaaS score
      const { data: caasScore, error: caasError } = await supabase
        .from('caas_scores')
        .select('*')
        .eq('profile_id', params.profile_id)
        .eq('role_type', roleType)
        .maybeSingle();

      if (caasError) {
        console.error('CaaS score query error:', caasError);
        return NextResponse.json(
          {
            error: 'query_failed',
            message: 'Failed to fetch CaaS score',
          },
          { status: 500 }
        );
      }

      if (!caasScore) {
        return NextResponse.json(
          {
            error: 'score_not_found',
            message: 'No CaaS score found for this profile and role type',
            profile_id: params.profile_id,
            role_type: roleType,
          },
          { status: 404 }
        );
      }

      // Calculate percentile rank (requires total scores query)
      const { data: allScores } = await supabase
        .from('caas_scores')
        .select('total_score')
        .eq('role_type', roleType);

      let percentile = 0;
      if (allScores && allScores.length > 0) {
        const lowerScores = allScores.filter(
          (s) => s.total_score < caasScore.total_score
        ).length;
        percentile = (lowerScores / allScores.length) * 100;
      }

      // Determine rank label
      let rank = 'Poor';
      if (caasScore.total_score >= 90) rank = 'Outstanding';
      else if (caasScore.total_score >= 80) rank = 'Excellent';
      else if (caasScore.total_score >= 70) rank = 'Very Good';
      else if (caasScore.total_score >= 60) rank = 'Good';
      else if (caasScore.total_score >= 50) rank = 'Average';
      else if (caasScore.total_score >= 40) rank = 'Below Average';

      // Build base response
      const response: any = {
        success: true,
        profile_id: params.profile_id,
        role_type: roleType,
        score: {
          total: caasScore.total_score,
          breakdown: caasScore.score_breakdown || {},
          percentile: Math.round(percentile * 100) / 100,
          rank,
        },
        metadata: {
          calculated_at: caasScore.calculated_at,
          calculation_version: caasScore.calculation_version,
          last_updated: caasScore.updated_at,
        },
      };

      // Optionally include detailed stats
      if (includeBreakdown && roleType === 'TUTOR') {
        // Fetch detailed performance stats
        const { data: perfStats } = await supabase.rpc('get_performance_stats', {
          user_id: params.profile_id,
        });

        const { data: networkStats } = await supabase.rpc('get_network_stats', {
          user_id: params.profile_id,
        });

        const { data: digitalStats } = await supabase.rpc('get_digital_stats', {
          user_id: params.profile_id,
        });

        response.detailed_stats = {
          performance: perfStats?.[0] || null,
          network: networkStats?.[0] || null,
          digital: digitalStats?.[0] || null,
        };
      }

      return NextResponse.json(response);
    },
    {
      requiredScopes: ['caas:read'],
    }
  );
}
