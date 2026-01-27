/**
 * Filename: apps/web/src/app/api/cron/session-reminders/route.ts
 * Purpose: Send session reminder emails 24 hours before upcoming bookings
 * Created: 2025-01-27
 *
 * Called by pg_cron every hour to check for sessions starting in 23-25 hours
 * and send reminder emails to both client and tutor.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendSessionReminderEmail,
  type BookingEmailData,
} from '@/lib/email-templates/booking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/session-reminders
 * Processes upcoming sessions and sends 24-hour reminder emails
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Session Reminders] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Calculate time window: sessions starting in 23-25 hours
    // This 2-hour window ensures we don't miss any sessions even if cron runs slightly late
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 hours from now

    console.log('[Session Reminders] Checking sessions between:', {
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    });

    // Fetch confirmed bookings in the reminder window that haven't been reminded yet
    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(id, full_name, email),
        tutor:profiles!tutor_id(id, full_name, email)
      `)
      .eq('status', 'Confirmed')
      .gte('session_start_time', windowStart.toISOString())
      .lte('session_start_time', windowEnd.toISOString())
      .is('reminder_sent_at', null); // Only bookings that haven't been reminded

    if (fetchError) {
      console.error('[Session Reminders] Failed to fetch bookings:', fetchError);
      throw fetchError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('[Session Reminders] No sessions need reminders');
      return NextResponse.json({
        success: true,
        message: 'No sessions need reminders',
        processed: 0,
      });
    }

    console.log(`[Session Reminders] Found ${bookings.length} sessions to remind`);

    const results = {
      processed: 0,
      clientEmails: 0,
      tutorEmails: 0,
      errors: 0,
    };

    // Process each booking
    for (const booking of bookings) {
      try {
        const emailData: BookingEmailData = {
          bookingId: booking.id,
          serviceName: booking.service_name,
          sessionDate: new Date(booking.session_start_time),
          sessionDuration: booking.session_duration,
          amount: booking.amount,
          subjects: booking.subjects,
          locationType: booking.location_type,
          locationCity: booking.location_city,
          tutorName: booking.tutor?.full_name || 'Tutor',
          tutorEmail: booking.tutor?.email || '',
          clientName: booking.client?.full_name || 'Client',
          clientEmail: booking.client?.email || '',
        };

        // Send reminder to client
        if (emailData.clientEmail) {
          try {
            await sendSessionReminderEmail(emailData, 'client');
            results.clientEmails++;
            console.log(`[Session Reminders] Sent client reminder for booking ${booking.id}`);
          } catch (err) {
            console.error(`[Session Reminders] Failed to send client reminder:`, err);
            results.errors++;
          }
        }

        // Send reminder to tutor
        if (emailData.tutorEmail) {
          try {
            await sendSessionReminderEmail(emailData, 'tutor');
            results.tutorEmails++;
            console.log(`[Session Reminders] Sent tutor reminder for booking ${booking.id}`);
          } catch (err) {
            console.error(`[Session Reminders] Failed to send tutor reminder:`, err);
            results.errors++;
          }
        }

        // Mark booking as reminded (prevent duplicate reminders)
        await supabase
          .from('bookings')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', booking.id);

        results.processed++;
      } catch (bookingError) {
        console.error(`[Session Reminders] Error processing booking ${booking.id}:`, bookingError);
        results.errors++;
      }
    }

    console.log('[Session Reminders] Completed:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Session Reminders] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
