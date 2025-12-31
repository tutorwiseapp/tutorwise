/**
 * Filename: src/app/api/seo/stats/route.ts
 * Purpose: SEO eligibility statistics endpoint
 * Created: 2025-12-31
 * Phase: Trust-First SEO - API Access
 *
 * Provides aggregate statistics on SEO eligibility for:
 * - Platform dashboards
 * - Public transparency metrics
 * - Partner reporting
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface SEOStats {
  profiles: {
    total: number;
    eligible: number;
    eligibility_rate: number;
    by_score_range: {
      high_trust: number; // 80-100
      trusted: number; // 75-79
      moderate: number; // 60-74
      low: number; // 0-59
    };
    by_role: {
      tutor: { total: number; eligible: number };
      agent: { total: number; eligible: number };
      client: { total: number; eligible: number };
    };
  };
  listings: {
    total_active: number;
    from_eligible_providers: number;
    eligibility_rate: number;
  };
  updated_at: string;
}

/**
 * GET /api/seo/stats
 * Returns aggregated SEO eligibility statistics
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Profile statistics
    const { data: profileStats } = await supabase
      .from('profiles')
      .select('role, seo_eligible, seo_eligibility_score');

    const totalProfiles = profileStats?.length || 0;
    const eligibleProfiles = profileStats?.filter((p) => p.seo_eligible).length || 0;

    // Score ranges
    const highTrust = profileStats?.filter((p) => p.seo_eligibility_score >= 80).length || 0;
    const trusted = profileStats?.filter(
      (p) => p.seo_eligibility_score >= 75 && p.seo_eligibility_score < 80
    ).length || 0;
    const moderate = profileStats?.filter(
      (p) => p.seo_eligibility_score >= 60 && p.seo_eligibility_score < 75
    ).length || 0;
    const low = profileStats?.filter((p) => p.seo_eligibility_score < 60).length || 0;

    // By role
    const tutorStats = profileStats?.filter((p) => p.role === 'tutor') || [];
    const agentStats = profileStats?.filter((p) => p.role === 'agent') || [];
    const clientStats = profileStats?.filter((p) => p.role === 'client') || [];

    // Listing statistics
    const { count: totalActiveListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: eligibleListings } = await supabase
      .from('listings')
      .select('profiles!inner(seo_eligible)', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('profiles.seo_eligible', true);

    const stats: SEOStats = {
      profiles: {
        total: totalProfiles,
        eligible: eligibleProfiles,
        eligibility_rate: totalProfiles > 0 ? eligibleProfiles / totalProfiles : 0,
        by_score_range: {
          high_trust: highTrust,
          trusted: trusted,
          moderate: moderate,
          low: low,
        },
        by_role: {
          tutor: {
            total: tutorStats.length,
            eligible: tutorStats.filter((p) => p.seo_eligible).length,
          },
          agent: {
            total: agentStats.length,
            eligible: agentStats.filter((p) => p.seo_eligible).length,
          },
          client: {
            total: clientStats.length,
            eligible: clientStats.filter((p) => p.seo_eligible).length,
          },
        },
      },
      listings: {
        total_active: totalActiveListings || 0,
        from_eligible_providers: eligibleListings || 0,
        eligibility_rate:
          totalActiveListings && totalActiveListings > 0
            ? (eligibleListings || 0) / totalActiveListings
            : 0,
      },
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minute cache
      },
    });
  } catch (error) {
    console.error('SEO stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEO statistics' },
      { status: 500 }
    );
  }
}
