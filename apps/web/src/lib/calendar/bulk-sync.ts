/**
 * Filename: apps/web/src/lib/calendar/bulk-sync.ts
 * Purpose: Bulk sync existing bookings when calendar is first connected
 * Created: 2026-02-06
 *
 * When a user connects their calendar for the first time, retroactively
 * sync all their existing confirmed bookings to create calendar events.
 */

import { createClient } from '@/utils/supabase/server';
import { syncBookingConfirmation } from './sync-booking';
import type { Booking } from '@/types';

interface BulkSyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: Array<{ booking_id: string; error: string }>;
}

/**
 * Sync all existing confirmed bookings for a user to their newly connected calendar
 *
 * @param profileId - The user's profile ID
 * @returns Summary of sync results
 */
export async function bulkSyncExistingBookings(profileId: string): Promise<BulkSyncResult> {
  const supabase = await createClient();

  const result: BulkSyncResult = {
    total: 0,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Find all confirmed bookings where user is client or tutor
    // Only sync future bookings (past bookings don't need calendar events)
    const now = new Date().toISOString();

    const { data: bookings, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        client:profiles!client_id(id, full_name, email),
        tutor:profiles!tutor_id(id, full_name, email)
      `)
      .eq('status', 'Confirmed')
      .gte('session_start_time', now) // Only future bookings
      .or(`client_id.eq.${profileId},tutor_id.eq.${profileId}`)
      .order('session_start_time', { ascending: true });

    if (fetchError) {
      console.error('[Bulk Sync] Failed to fetch bookings:', fetchError);
      throw fetchError;
    }

    if (!bookings || bookings.length === 0) {
      console.log(`[Bulk Sync] No existing confirmed bookings found for user ${profileId}`);
      return result;
    }

    result.total = bookings.length;
    console.log(`[Bulk Sync] Found ${bookings.length} confirmed booking(s) to sync for user ${profileId}`);

    // Sync each booking
    for (const booking of bookings as Booking[]) {
      try {
        await syncBookingConfirmation(booking);
        result.synced++;
        console.log(`[Bulk Sync] ✅ Synced booking ${booking.id}`);
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          booking_id: booking.id,
          error: errorMessage,
        });
        console.error(`[Bulk Sync] ❌ Failed to sync booking ${booking.id}:`, error);
        // Continue with next booking - don't let one failure stop the whole sync
      }

      // Add small delay to avoid rate limiting (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(
      `[Bulk Sync] Completed for user ${profileId}: ${result.synced}/${result.total} synced, ${result.failed} failed`
    );

    return result;
  } catch (error) {
    console.error('[Bulk Sync] Fatal error:', error);
    throw error;
  }
}
