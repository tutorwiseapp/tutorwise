/**
 * Filename: route.ts
 * Path: /api/dashboard/student-breakdown
 * Purpose: API endpoint to get student type breakdown (new vs returning)
 * Created: 2025-12-07
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This endpoint is only relevant for tutors and agents
    // For clients, we could show breakdown of tutors they've worked with
    // For tutors/agents, we show breakdown of students they've taught

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_role')
      .eq('id', user.id)
      .single();

    const role = profile?.active_role || 'client';

    let newStudents = 0;
    let returningStudents = 0;

    if (role === 'tutor' || role === 'agent') {
      // Get all completed bookings for this tutor/agent
      const { data: bookings } = await supabase
        .from('bookings')
        .select('client_id, session_start_time')
        .or(`tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('session_start_time', { ascending: true });

      if (bookings && bookings.length > 0) {
        // Track first booking date for each client
        const clientFirstBooking = new Map<string, string>();

        bookings.forEach((booking) => {
          const clientId = booking.client_id;
          const bookingDate = booking.session_start_time;

          if (!clientFirstBooking.has(clientId)) {
            clientFirstBooking.set(clientId, bookingDate);
          }
        });

        // Count unique students
        const uniqueStudents = new Set(bookings.map(b => b.client_id));

        // For each unique student, check if they have more than one booking
        uniqueStudents.forEach((clientId) => {
          const studentBookings = bookings.filter(b => b.client_id === clientId);

          if (studentBookings.length === 1) {
            newStudents++;
          } else {
            returningStudents++;
          }
        });
      }
    } else if (role === 'client') {
      // For clients, show breakdown of tutors they've worked with
      const { data: bookings } = await supabase
        .from('bookings')
        .select('tutor_id, session_start_time')
        .eq('client_id', user.id)
        .eq('status', 'completed')
        .order('session_start_time', { ascending: true });

      if (bookings && bookings.length > 0) {
        // Track first booking date for each tutor
        const tutorFirstBooking = new Map<string, string>();

        bookings.forEach((booking) => {
          const tutorId = booking.tutor_id;
          const bookingDate = booking.session_start_time;

          if (!tutorFirstBooking.has(tutorId)) {
            tutorFirstBooking.set(tutorId, bookingDate);
          }
        });

        // Count unique tutors
        const uniqueTutors = new Set(bookings.map(b => b.tutor_id));

        // For each unique tutor, check if client has more than one booking with them
        uniqueTutors.forEach((tutorId) => {
          const tutorBookings = bookings.filter(b => b.tutor_id === tutorId);

          if (tutorBookings.length === 1) {
            newStudents++; // In this context, "new" means a tutor the client has only worked with once
          } else {
            returningStudents++; // "Returning" means a tutor the client has worked with multiple times
          }
        });
      }
    }

    return NextResponse.json({
      new: newStudents,
      returning: returningStudents
    });

  } catch (error) {
    console.error('[API] Error fetching student breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student breakdown' },
      { status: 500 }
    );
  }
}
