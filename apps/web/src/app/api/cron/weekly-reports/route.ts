/**
 * Filename: apps/web/src/app/api/cron/weekly-reports/route.ts
 * Purpose: Send weekly activity reports to tutors and agents
 * Created: 2025-01-27
 *
 * Called by pg_cron every Monday at 8am UTC to send weekly summaries
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendTutorWeeklyReport,
  sendAgentWeeklyReport,
  type TutorWeeklyReportData,
  type AgentWeeklyReportData,
} from '@/lib/email-templates/reports';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/weekly-reports
 * Generates and sends weekly reports to tutors and agents
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Weekly Reports] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Calculate last week's date range (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const weekEnd = new Date(now);
    weekEnd.setUTCDate(now.getUTCDate() - daysToLastMonday);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setUTCDate(weekEnd.getUTCDate() - 6);
    weekStart.setUTCHours(0, 0, 0, 0);

    console.log('[Weekly Reports] Processing week:', {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });

    const results = {
      tutorReports: 0,
      agentReports: 0,
      errors: 0,
    };

    // ========================================
    // TUTOR REPORTS
    // ========================================

    // Get all active tutors
    const { data: tutors, error: tutorError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or('active_role.eq.tutor,roles.cs.{tutor}')
      .not('email', 'is', null);

    if (tutorError) {
      console.error('[Weekly Reports] Failed to fetch tutors:', tutorError);
    } else if (tutors) {
      for (const tutor of tutors) {
        try {
          // Get booking stats
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, status, created_at, session_start_time')
            .eq('tutor_id', tutor.id)
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());

          const newBookings = bookings?.length || 0;
          const completedSessions = bookings?.filter(b => b.status === 'Completed').length || 0;
          const cancelledBookings = bookings?.filter(b => b.status === 'Cancelled').length || 0;

          // Get upcoming sessions
          const { count: upcomingSessions } = await supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .eq('tutor_id', tutor.id)
            .eq('status', 'Confirmed')
            .gte('session_start_time', now.toISOString());

          // Get earnings (transactions where they're the tutor)
          const { data: earnings } = await supabase
            .from('transactions')
            .select('amount, status')
            .eq('profile_id', tutor.id)
            .eq('type', 'Tutor Payment')
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());

          const totalEarnings = earnings?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          // Get pending and available balances
          const { data: allTransactions } = await supabase
            .from('transactions')
            .select('amount, status')
            .eq('profile_id', tutor.id)
            .in('type', ['Tutor Payment', 'Withdrawal', 'Refund']);

          const pendingEarnings = allTransactions
            ?.filter(t => t.status === 'clearing')
            .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          const availableBalance = allTransactions
            ?.filter(t => t.status === 'available')
            .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          // Get profile/listing views (if tracking exists)
          const { count: profileViews } = await supabase
            .from('profile_views')
            .select('id', { count: 'exact' })
            .eq('viewed_profile_id', tutor.id)
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());

          // Skip if no activity
          if (newBookings === 0 && totalEarnings === 0 && (profileViews || 0) === 0) {
            continue;
          }

          const reportData: TutorWeeklyReportData = {
            tutorName: tutor.full_name || 'Tutor',
            tutorEmail: tutor.email!,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            newBookings,
            completedSessions,
            cancelledBookings,
            upcomingSessions: upcomingSessions || 0,
            totalEarnings,
            pendingEarnings,
            availableBalance,
            newReviews: 0, // TODO: Add reviews count
            profileViews: profileViews || 0,
            listingViews: 0, // TODO: Add listing views
          };

          await sendTutorWeeklyReport(reportData);
          results.tutorReports++;
          console.log(`[Weekly Reports] Sent tutor report to: ${tutor.email}`);
        } catch (err) {
          console.error(`[Weekly Reports] Failed to process tutor ${tutor.id}:`, err);
          results.errors++;
        }
      }
    }

    // ========================================
    // AGENT REPORTS
    // ========================================

    // Get all active agents
    const { data: agents, error: agentError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or('active_role.eq.agent,roles.cs.{agent}')
      .not('email', 'is', null);

    if (agentError) {
      console.error('[Weekly Reports] Failed to fetch agents:', agentError);
    } else if (agents) {
      for (const agent of agents) {
        try {
          // Get referral stats this week
          const { data: referrals } = await supabase
            .from('referrals')
            .select('id, status, created_at')
            .eq('referrer_id', agent.id)
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());

          const newReferrals = referrals?.length || 0;
          const signedUp = referrals?.filter(r => r.status === 'Signed Up').length || 0;
          const converted = referrals?.filter(r => r.status === 'Converted').length || 0;

          // Get all-time active referrals
          const { count: totalActiveReferrals } = await supabase
            .from('referrals')
            .select('id', { count: 'exact' })
            .eq('referrer_id', agent.id)
            .neq('status', 'Expired');

          // Get commission this week
          const { data: commissions } = await supabase
            .from('transactions')
            .select('amount, status')
            .eq('profile_id', agent.id)
            .eq('type', 'Referrer Payment')
            .gte('created_at', weekStart.toISOString())
            .lte('created_at', weekEnd.toISOString());

          const commissionEarned = commissions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          // Get pending and all-time commission
          const { data: allCommissions } = await supabase
            .from('transactions')
            .select('amount, status')
            .eq('profile_id', agent.id)
            .eq('type', 'Referrer Payment');

          const pendingCommission = allCommissions
            ?.filter(t => t.status === 'clearing')
            .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          const totalCommissionAllTime = allCommissions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

          // Calculate conversion rate
          const { count: totalReferrals } = await supabase
            .from('referrals')
            .select('id', { count: 'exact' })
            .eq('referrer_id', agent.id);

          const { count: convertedTotal } = await supabase
            .from('referrals')
            .select('id', { count: 'exact' })
            .eq('referrer_id', agent.id)
            .eq('status', 'Converted');

          const conversionRate = (totalReferrals || 0) > 0
            ? (convertedTotal || 0) / (totalReferrals || 1)
            : 0;

          // Skip if no activity
          if (newReferrals === 0 && commissionEarned === 0) {
            continue;
          }

          const reportData: AgentWeeklyReportData = {
            agentName: agent.full_name || 'Agent',
            agentEmail: agent.email!,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            newReferrals,
            signedUp,
            converted,
            totalActiveReferrals: totalActiveReferrals || 0,
            commissionEarned,
            pendingCommission,
            totalCommissionAllTime,
            conversionRate,
          };

          await sendAgentWeeklyReport(reportData);
          results.agentReports++;
          console.log(`[Weekly Reports] Sent agent report to: ${agent.email}`);
        } catch (err) {
          console.error(`[Weekly Reports] Failed to process agent ${agent.id}:`, err);
          results.errors++;
        }
      }
    }

    console.log('[Weekly Reports] Completed:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Weekly Reports] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
