/**
 * Filename: apps/web/src/app/api/cron/session-reminders/route.ts
 * Purpose: Send session reminder emails at multiple intervals (24h, 1h, 15min)
 * Created: 2025-01-27
 * Updated: 2026-02-07 - Added support for multi-interval reminders
 *
 * Called by pg_cron at different intervals:
 * - Hourly for 24h reminders (23-25h window)
 * - Every 15 minutes for 1h reminders (45-75min window)
 * - Every 5 minutes for 15min reminders (15-20min window)
 *
 * Query param 'type' can be: '24h', '1h', '15min' (defaults to '24h' for backward compatibility)
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  getUpcomingReminders,
  sendReminder,
  type ReminderType,
} from '@/lib/reminders/reminder-scheduler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/session-reminders?type=<reminder_type>
 * Processes upcoming sessions and sends reminder emails
 * Query params:
 *  - type: '24h', '1h', or '15min' (defaults to '24h' for backward compatibility)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Session Reminders] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get reminder type from query params (default to 24h for backward compatibility)
    const searchParams = request.nextUrl.searchParams;
    const reminderType = (searchParams.get('type') || '24h') as ReminderType;

    // Validate reminder type
    if (!['24h', '1h', '15min'].includes(reminderType)) {
      return NextResponse.json(
        { error: 'Invalid reminder type. Must be: 24h, 1h, or 15min' },
        { status: 400 }
      );
    }

    // Define time windows for each reminder type
    const windowMinutes = {
      '24h': 120,  // 2-hour window (23-25h before session)
      '1h': 30,    // 30-minute window (45-75min before session)
      '15min': 5,  // 5-minute window (15-20min before session)
    }[reminderType];

    console.log(`[Session Reminders] Processing ${reminderType} reminders (window: ${windowMinutes}min)`);

    // Get upcoming reminders
    const reminders = await getUpcomingReminders(reminderType, windowMinutes);

    if (reminders.length === 0) {
      console.log(`[Session Reminders] No ${reminderType} reminders need sending`);
      return NextResponse.json({
        success: true,
        message: `No ${reminderType} reminders to send`,
        type: reminderType,
        processed: 0,
      });
    }

    console.log(`[Session Reminders] Found ${reminders.length} ${reminderType} reminders to send`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
    };

    // Send each reminder
    for (const reminder of reminders) {
      try {
        const success = await sendReminder(reminder.reminder_id, reminder);

        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }

        results.processed++;
      } catch (error) {
        console.error(`[Session Reminders] Error sending reminder ${reminder.reminder_id}:`, error);
        results.failed++;
        results.processed++;
      }
    }

    console.log(`[Session Reminders] Completed ${reminderType} reminders:`, results);

    return NextResponse.json({
      success: true,
      type: reminderType,
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
