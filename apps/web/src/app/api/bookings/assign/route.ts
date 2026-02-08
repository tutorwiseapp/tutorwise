/**
 * POST /api/bookings/assign
 * Purpose: Assign a student (attendee) to a booking (v5.0)
 *
 * This endpoint allows a Client (Parent) to assign which student will attend
 * a booked lesson. The student can be either:
 * 1. The Client themselves (adult learner use case)
 * 2. A linked student via Guardian Link
 *
 * Updated v5.1: Refactored to use BookingService (API Solution Design v5.1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { BookingService } from '@/lib/services/BookingService';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AssignSchema = z.object({
  booking_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

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

    // Rate limiting (100 actions per day)
    const rateLimit = await checkRateLimit(user.id, 'student:action');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt)
        }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const validation = AssignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { booking_id, student_id } = validation.data;

    // 3. Assign student using BookingService
    const booking = await BookingService.assignStudent({
      bookingId: booking_id,
      clientId: user.id,
      studentId: student_id,
    });

    // 4. TODO: Log to audit_log
    // await logAuditEvent({
    //   action: 'BOOKING_STUDENT_ASSIGNED',
    //   user_id: user.id,
    //   resource_type: 'booking',
    //   resource_id: booking_id,
    //   metadata: { student_id }
    // });

    return NextResponse.json(
      {
        success: true,
        message: 'Student assigned to booking successfully',
        booking_id,
        student_id,
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('Error in POST /api/bookings/assign:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('Booking not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('Invalid guardian-student link')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
