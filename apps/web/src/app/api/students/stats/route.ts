/**
 * Filename: apps/web/src/app/api/students/stats/route.ts
 * Purpose: Fetch aggregated student portfolio statistics
 * Created: 2026-02-09
 *
 * Returns stats for StudentStatsWidget:
 * - Total active students
 * - Profile completion status
 * - Learning preferences status
 * - Students needing attention
 * - Pending invitations
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface StudentStats {
  totalStudents: number;
  profileComplete: number;
  profileIncomplete: number;
  preferencesSet: number;
  preferencesMissing: number;
  needsAttention: number;
  pendingInvitations: number;
  addedThisMonth: number;
}

/**
 * GET /api/students/stats
 * Get aggregated statistics about the user's students
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active guardian links with student profiles
    const { data: guardianLinks, error: linksError } = await supabase
      .from('profile_graph')
      .select(`
        id,
        target_profile_id,
        created_at,
        student:target_profile_id (
          id,
          full_name,
          email,
          date_of_birth,
          preferences
        )
      `)
      .eq('source_profile_id', user.id)
      .eq('relationship_type', 'GUARDIAN')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (linksError) {
      console.error('[Student Stats] Error fetching guardian links:', linksError);
      throw linksError;
    }

    const students = (guardianLinks || []).map((link: any) => ({
      id: link.id,
      studentId: link.target_profile_id,
      createdAt: link.created_at,
      profile: Array.isArray(link.student) ? link.student[0] : link.student,
    }));

    // Calculate profile completion
    const requiredFields = ['full_name', 'email', 'date_of_birth'];
    const profileComplete = students.filter((s) => {
      if (!s.profile) return false;
      return requiredFields.every((field) => s.profile[field]);
    }).length;

    // Calculate learning preferences set (stored in role_details, use preferences JSONB as proxy)
    const preferencesSet = students.filter((s) => {
      if (!s.profile) return false;
      const prefs = s.profile.preferences;
      return prefs && typeof prefs === 'object' && Object.keys(prefs).length > 0;
    }).length;

    // Calculate students added this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const addedThisMonth = students.filter(
      (s) => new Date(s.createdAt) > oneMonthAgo
    ).length;

    // Get pending invitations
    const { count: pendingInvitationsCount } = await supabase
      .from('guardian_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('guardian_id', user.id)
      .eq('status', 'pending');

    // TODO: Calculate needsAttention (students with low attendance or no recent sessions)
    // This would require querying bookings table for attendance/session history
    const needsAttention = 0;

    const stats: StudentStats = {
      totalStudents: students.length,
      profileComplete,
      profileIncomplete: students.length - profileComplete,
      preferencesSet,
      preferencesMissing: students.length - preferencesSet,
      needsAttention,
      pendingInvitations: pendingInvitationsCount || 0,
      addedThisMonth,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Student Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student statistics' },
      { status: 500 }
    );
  }
}
