/**
 * Filename: apps/web/src/app/api/cron/no-show-detection/route.ts
 * Purpose: Automatically detect and report potential no-shows
 * Created: 2026-02-07
 *
 * Called by pg_cron every 15 minutes to check for sessions that:
 * - Started more than 30 minutes ago
 * - Are still in Confirmed status
 * - Haven't been marked as completed or no-show
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  detectPotentialNoShows,
  autoMarkAsNoShow,
  sendNoShowAlert,
} from '@/lib/no-show/detection';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/no-show-detection
 * Detects and processes potential no-shows
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[No-Show Detection] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[No-Show Detection] Running detection...');

    // Detect potential no-shows
    const potentialNoShows = await detectPotentialNoShows();

    if (potentialNoShows.length === 0) {
      console.log('[No-Show Detection] No potential no-shows found');
      return NextResponse.json({
        success: true,
        message: 'No potential no-shows detected',
        detected: 0,
        processed: 0,
      });
    }

    console.log(`[No-Show Detection] Found ${potentialNoShows.length} potential no-shows`);

    const results = {
      detected: potentialNoShows.length,
      processed: 0,
      alerted: 0,
      errors: 0,
    };

    // Process each potential no-show
    for (const bookingId of potentialNoShows) {
      try {
        // Create no-show report
        const report = await autoMarkAsNoShow(bookingId);

        if (report) {
          results.processed++;

          // Send alert emails
          const alertSent = await sendNoShowAlert(bookingId);

          if (alertSent) {
            results.alerted++;
            console.log(`[No-Show Detection] Processed and alerted for booking: ${bookingId}`);
          } else {
            console.log(`[No-Show Detection] Processed but alert failed for booking: ${bookingId}`);
          }
        } else {
          console.log(`[No-Show Detection] Failed to process booking: ${bookingId}`);
          results.errors++;
        }
      } catch (error) {
        console.error(`[No-Show Detection] Error processing booking ${bookingId}:`, error);
        results.errors++;
      }
    }

    console.log('[No-Show Detection] Completed:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[No-Show Detection] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
