/**
 * Filename: apps/web/src/app/api/cron/complete-sessions/route.ts
 * Purpose: Automatically complete bookings after session end time passes
 * Created: 2026-02-06
 *
 * Called by pg_cron every hour to check for sessions that should be marked as Completed.
 *
 * Completion rules:
 * - Session start_time + duration has passed
 * - Current status is 'Confirmed'
 * - Scheduling status is 'scheduled'
 * - Automatically triggers review email sequence
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/complete-sessions
 * Processes sessions that have ended and marks them as Completed
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Session Completion] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    const now = new Date();

    console.log('[Session Completion] Checking for completed sessions at:', now.toISOString());

    // Find confirmed bookings where session has ended
    // session_start_time + duration_minutes < NOW
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        session_start_time,
        duration_minutes,
        service_name,
        client:profiles!client_id(id, full_name, email),
        tutor:profiles!tutor_id(id, full_name, email)
      `)
      .eq('status', 'Confirmed')
      .eq('scheduling_status', 'scheduled')
      .not('session_start_time', 'is', null);

    if (fetchError) {
      console.error('[Session Completion] Failed to fetch bookings:', fetchError);
      throw fetchError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Session Completion] No confirmed sessions found');
      return NextResponse.json({
        success: true,
        message: 'No sessions need completion',
        processed: 0,
      });
    }

    // Filter bookings where session has ended
    const completedBookings = bookings.filter(booking => {
      if (!booking.session_start_time) return false;

      const sessionStart = new Date(booking.session_start_time);
      const sessionEnd = new Date(sessionStart.getTime() + (booking.duration_minutes || 60) * 60 * 1000);

      return sessionEnd < now;
    });

    if (completedBookings.length === 0) {
      console.log('[Session Completion] No sessions have ended yet');
      return NextResponse.json({
        success: true,
        message: 'No sessions have ended yet',
        processed: 0,
      });
    }

    console.log(`[Session Completion] Found ${completedBookings.length} sessions to complete`);

    const results = {
      processed: 0,
      errors: 0,
      bookingIds: [] as string[],
    };

    // Update each booking to Completed status
    for (const booking of completedBookings) {
      try {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'Completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);

        if (updateError) {
          console.error(`[Session Completion] Failed to update booking ${booking.id}:`, updateError);
          results.errors++;
          continue;
        }

        results.processed++;
        results.bookingIds.push(booking.id);
        console.log(`[Session Completion] ✅ Completed booking ${booking.id}`);

        // TODO: Trigger review email sequence here
        // This would be handled by a separate system that watches for Completed status
        // or we could add a review_emails queue

      } catch (bookingError) {
        console.error(`[Session Completion] Error processing booking ${booking.id}:`, bookingError);
        results.errors++;
      }
    }

    console.log('[Session Completion] Completed processing:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Session Completion] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
