/**
 * GET /api/v1/referrals/stats
 * Purpose: Get referral performance statistics (AI agent endpoint)
 * Authentication: API key required (Bearer token)
 * Scope: referrals:read
 *
 * Use Cases:
 * - AI dashboard: "Show me my referral stats"
 * - Automated reports: Daily referral performance emails
 * - Analytics integration: Sync referral data to BI tools
 */

import { withApiAuth } from '@/middleware/api-auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiAuth(
    request,
    async (authContext) => {
      const supabase = await createClient();
      const { searchParams } = new URL(request.url);

      // Optional filters
      const status = searchParams.get('status'); // 'Referred', 'Signed Up', 'Converted'
      const days = parseInt(searchParams.get('days') || '30'); // Last N days

      // Get referral statistics
      let query = supabase
        .from('referrals')
        .select('*', { count: 'exact' })
        .eq('agent_id', authContext.profileId);

      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }

      // Apply date filter
      if (days > 0) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: referrals, count, error } = await query;

      if (error) {
        console.error('Referrals query error:', error);
        return NextResponse.json(
          {
            error: 'query_failed',
            message: 'Failed to fetch referrals',
          },
          { status: 500 }
        );
      }

      // Calculate statistics
      const totalReferrals = count || 0;
      const byStatus = {
        referred: referrals?.filter((r) => r.status === 'Referred').length || 0,
        signed_up: referrals?.filter((r) => r.status === 'Signed Up').length || 0,
        converted: referrals?.filter((r) => r.status === 'Converted').length || 0,
      };

      const byAttributionMethod = referrals?.reduce((acc, r) => {
        const method = r.attribution_method || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const bySource = referrals?.reduce((acc, r) => {
        const source = r.referral_source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get commission data
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, status')
        .eq('profile_id', authContext.profileId)
        .eq('type', 'Referral Commission');

      const totalCommissions = transactions?.reduce((sum, t) => {
        if (t.status === 'completed' || t.status === 'available') {
          return sum + parseFloat(t.amount || '0');
        }
        return sum;
      }, 0) || 0;

      const pendingCommissions = transactions?.reduce((sum, t) => {
        if (t.status === 'pending') {
          return sum + parseFloat(t.amount || '0');
        }
        return sum;
      }, 0) || 0;

      // Conversion rate
      const conversionRate =
        byStatus.signed_up > 0
          ? ((byStatus.converted / byStatus.signed_up) * 100).toFixed(2)
          : '0.00';

      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', authContext.profileId)
        .single();

      return NextResponse.json({
        success: true,
        stats: {
          total_referrals: totalReferrals,
          by_status: byStatus,
          by_attribution_method: byAttributionMethod,
          by_source: bySource,
          conversion_rate: parseFloat(conversionRate),
          commissions: {
            total_earned: totalCommissions,
            pending: pendingCommissions,
            currency: 'GBP',
          },
        },
        referral_code: profile?.referral_code,
        referral_link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tutorwise.com'}/a/${profile?.referral_code}`,
        period: {
          days,
          start_date: days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null,
          end_date: new Date().toISOString(),
        },
      });
    },
    {
      requiredScopes: ['referrals:read'],
    }
  );
}
