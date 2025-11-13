/**
 * POST /api/bookings/assign
 * Purpose: Assign a student (attendee) to a booking (v5.0)
 *
 * This endpoint allows a Client (Parent) to assign which student will attend
 * a booked lesson. The student can be either:
 * 1. The Client themselves (adult learner use case)
 * 2. A linked student via Guardian Link
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface AssignBookingRequest {
  booking_id: string;
  student_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: AssignBookingRequest = await request.json();
    const { booking_id, student_id } = body;

    if (!booking_id || !student_id) {
      return NextResponse.json(
        { error: 'booking_id and student_id are required' },
        { status: 400 }
      );
    }

    // 3. Verify the Client owns this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, client_id, student_id, status')
      .eq('id', booking_id)
      .eq('client_id', user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or you do not have permission to modify it' },
        { status: 404 }
      );
    }

    // 4. Verify the student_id is valid:
    //    a) Either the Client's own ID (adult learner)
    //    b) OR a valid Guardian Link
    let isValidStudent = false;

    if (student_id === user.id) {
      // Adult learner - Client is attending their own lesson
      isValidStudent = true;
    } else {
      // Check for Guardian Link
      const { data: guardianLink, error: linkError } = await supabase
        .from('profile_graph')
        .select('id')
        .eq('source_profile_id', user.id)
        .eq('target_profile_id', student_id)
        .eq('relationship_type', 'GUARDIAN')
        .eq('status', 'ACTIVE')
        .single();

      if (!linkError && guardianLink) {
        isValidStudent = true;
      }
    }

    if (!isValidStudent) {
      return NextResponse.json(
        { error: 'Invalid student_id. Student must be yourself or a linked student.' },
        { status: 403 }
      );
    }

    // 5. Update the booking with the assigned student
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ student_id })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Error assigning student to booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to assign student to booking' },
        { status: 500 }
      );
    }

    // 6. TODO: Log to audit_log
    // await logAuditEvent({
    //   action: 'BOOKING_STUDENT_ASSIGNED',
    //   user_id: user.id,
    //   resource_type: 'booking',
    //   resource_id: booking_id,
    //   metadata: { student_id }
    // });

    return NextResponse.json({
      success: true,
      message: 'Student assigned to booking successfully',
      booking_id,
      student_id,
    });

  } catch (error) {
    console.error('Error in POST /api/bookings/assign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
