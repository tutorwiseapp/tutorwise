/**
 * Filename: route.ts
 * Path: /api/sessions/create-free-help-session
 * Purpose: Create instant free help session (v5.9)
 * Created: 2025-11-16
 *
 * This endpoint bypasses ALL payment systems and creates an instant free session:
 * 1. Validates tutor is online
 * 2. Rate limits students (5 sessions per 7 days)
 * 3. Generates Google Meet link via meet.new
 * 4. Creates booking record (type: 'free_help', amount: 0)
 * 5. Sends notifications to tutor (placeholder for now)
 * 6. Returns meet link to student
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { isTutorOnline } from '@/lib/redis';

// Rate limiting: 5 sessions per 7 days per student
const RATE_LIMIT_WINDOW_DAYS = 7;
const RATE_LIMIT_MAX_SESSIONS = 5;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user (student)
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { tutorId } = body;

    if (!tutorId) {
      return NextResponse.json(
        { error: 'tutorId is required' },
        { status: 400 }
      );
    }

    // 3. Verify tutor is online in Redis
    const isOnline = await isTutorOnline(tutorId);
    if (!isOnline) {
      return NextResponse.json(
        { error: 'This tutor is no longer offering free help' },
        { status: 410 } // 410 Gone
      );
    }

    // 4. Get student profile
    const { data: studentProfile, error: studentError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    if (studentError || !studentProfile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    // 5. Get tutor profile
    const { data: tutorProfile, error: tutorError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', tutorId)
      .single();

    if (tutorError || !tutorProfile) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    if (tutorProfile.role !== 'tutor') {
      return NextResponse.json(
        { error: 'This user is not a tutor' },
        { status: 400 }
      );
    }

    // 6. Rate limiting: Check student's recent free help sessions
    const rateLimitDate = new Date();
    rateLimitDate.setDate(rateLimitDate.getDate() - RATE_LIMIT_WINDOW_DAYS);

    const { data: recentSessions, error: rateLimitError } = await supabase
      .from('bookings')
      .select('id')
      .eq('student_id', user.id)
      .eq('type', 'free_help')
      .gte('created_at', rateLimitDate.toISOString());

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return NextResponse.json(
        { error: 'Failed to check rate limit' },
        { status: 500 }
      );
    }

    if (recentSessions && recentSessions.length >= RATE_LIMIT_MAX_SESSIONS) {
      return NextResponse.json(
        {
          error: `You have reached the limit of ${RATE_LIMIT_MAX_SESSIONS} free sessions per ${RATE_LIMIT_WINDOW_DAYS} days`,
          rateLimitReached: true,
          sessionsUsed: recentSessions.length,
          maxSessions: RATE_LIMIT_MAX_SESSIONS,
        },
        { status: 429 } // 429 Too Many Requests
      );
    }

    // 7. Generate Google Meet link (meet.new approach)
    // meet.new instantly redirects to a new meeting room
    const meetUrl = 'https://meet.new';

    // 8. Create booking record
    const scheduledFor = new Date();
    const endsAt = new Date(scheduledFor.getTime() + 30 * 60 * 1000); // 30 minutes later

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        student_id: user.id,
        tutor_id: tutorId,
        type: 'free_help',
        status: 'Confirmed',
        scheduled_for: scheduledFor.toISOString(),
        ends_at: endsAt.toISOString(),
        duration_minutes: 30,
        amount: 0,
        currency: 'GBP',
        meet_link: meetUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Failed to create booking:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // 9. TODO: Send notifications to tutor
    // For now, this is a placeholder. Future implementation will:
    // - Send high-priority email via Resend
    // - Send push notification to tutor's devices
    // - Include student name, meet link, and "Join Now" button
    console.log(`[Free Help] Session created - notifying tutor ${tutorId}`);
    console.log(`[Free Help] Student: ${studentProfile.full_name} (${studentProfile.email})`);
    console.log(`[Free Help] Tutor: ${tutorProfile.full_name} (${tutorProfile.email})`);
    console.log(`[Free Help] Meet URL: ${meetUrl}`);
    console.log(`[Free Help] Booking ID: ${booking.id}`);

    // TODO: Implement notification system
    // await sendFreeHelpNotification({
    //   tutorEmail: tutorProfile.email,
    //   tutorName: tutorProfile.full_name,
    //   studentName: studentProfile.full_name,
    //   meetUrl,
    //   bookingId: booking.id,
    // });

    // 10. Return success with meet URL
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      meetUrl,
      sessionDetails: {
        tutorName: tutorProfile.full_name,
        scheduledFor: scheduledFor.toISOString(),
        durationMinutes: 30,
        type: 'free_help',
      },
      message: 'Free help session created! Joining meeting now...',
    });
  } catch (error) {
    console.error('[Create Free Help Session] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
