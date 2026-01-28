import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/profiles/[id]/stats
 * Fetch real-time statistics for a profile (ratings, reviews, bookings, etc.)
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const profileId = params.id;

    // Verify profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, roles, created_at')
      .eq('id', profileId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }
      throw profileError;
    }

    // ===========================================================
    // STEP 1: Calculate Average Rating and Review Count
    // ===========================================================
    const { data: reviewStats } = await supabase
      .from('profile_reviews')
      .select('rating')
      .eq('reviewee_id', profileId)
      .eq('session.status', 'published');

    const reviewCount = reviewStats?.length || 0;
    const averageRating = reviewCount > 0
      ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

    // ===========================================================
    // STEP 2: Calculate Sessions Completed
    // ===========================================================
    // Count bookings where the user is either tutor or client and status is 'Completed'
    const { count: completedAsTutor } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', profileId)
      .eq('status', 'Completed');

    const { count: completedAsClient } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', profileId)
      .eq('status', 'Completed');

    const sessionsCompleted = (completedAsTutor || 0) + (completedAsClient || 0);

    // ===========================================================
    // STEP 3: Calculate Response Time
    // ===========================================================
    // This would require conversations table - setting placeholder for now
    const responseTime = "< 2 hours"; // TODO: Calculate from conversations table

    // ===========================================================
    // STEP 4: Calculate Member Since
    // ===========================================================
    const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });

    // ===========================================================
    // STEP 5: Calculate Active Students/Clients
    // ===========================================================
    const { count: activeStudents } = await supabase
      .from('bookings')
      .select('student_id', { count: 'exact', head: true })
      .eq('tutor_id', profileId)
      .in('status', ['Confirmed', 'Pending']);

    const { count: activeTutors } = await supabase
      .from('bookings')
      .select('tutor_id', { count: 'exact', head: true })
      .eq('student_id', profileId)
      .in('status', ['Confirmed', 'Pending']);

    // ===========================================================
    // STEP 6: Role-Specific Statistics
    // ===========================================================
    let roleSpecificStats: any = {};

    // For agents: Calculate tutors represented and successful placements
    if (profile.roles?.includes('agent')) {
      // Tutors represented = unique tutor_ids in bookings where referrer is this agent
      const { data: representedTutors } = await supabase
        .from('bookings')
        .select('tutor_id')
        .eq('agent_id', profileId);

      const uniqueTutors = new Set(representedTutors?.map(b => b.tutor_id) || []);

      // Successful placements = completed bookings where this agent was the referrer
      const { count: successfulPlacements } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', profileId)
        .eq('status', 'Completed');

      roleSpecificStats.agent = {
        tutors_represented: uniqueTutors.size,
        successful_placements: successfulPlacements || 0,
      };
    }

    // For clients: Calculate tutors worked with
    if (profile.roles?.includes('client')) {
      const { data: workedWithTutors } = await supabase
        .from('bookings')
        .select('tutor_id')
        .eq('student_id', profileId)
        .eq('status', 'Completed');

      const uniqueTutorsWorkedWith = new Set(workedWithTutors?.map(b => b.tutor_id) || []);

      roleSpecificStats.client = {
        tutors_worked_with: uniqueTutorsWorkedWith.size,
      };
    }

    // ===========================================================
    // STEP 7: Return Combined Statistics
    // ===========================================================
    const stats = {
      average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      review_count: reviewCount,
      sessions_completed: sessionsCompleted,
      response_time: responseTime,
      member_since: memberSince,
      active_students: activeStudents || 0,
      active_tutors: activeTutors || 0,
      ...roleSpecificStats,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching profile stats:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
