/**
 * Filename: apps/web/src/lib/calendar/sync-booking.ts
 * Purpose: Sync booking lifecycle events to connected calendars
 * Created: 2026-02-06
 *
 * Automatically creates/updates/deletes calendar events when bookings are
 * confirmed, rescheduled, or cancelled. This is the central integration point
 * between booking lifecycle and calendar sync.
 */

import { createClient } from '@/utils/supabase/server';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getValidAccessToken,
} from './google';
import { safeDecrypt, encryptToken } from './encryption';
import type { Booking, CalendarConnection } from '@/types';

export type SyncAction = 'create' | 'update' | 'delete';

interface SyncResult {
  success: boolean;
  profile_id: string;
  provider: string;
  error?: string;
}

/**
 * Sync a booking to all connected calendars (client and tutor)
 *
 * This function is designed to be non-blocking - calendar sync failures
 * should NOT prevent booking operations from completing. Errors are logged
 * but the function always returns (never throws).
 *
 * @param booking - The booking to sync
 * @param action - What to do: 'create', 'update', or 'delete'
 * @returns Array of sync results (for logging/debugging)
 */
export async function syncBookingToCalendars(
  booking: Booking,
  action: SyncAction
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  try {
    const supabase = await createClient();

    // 1. Get all calendar connections for client and tutor
    const profileIds = [booking.client_id, booking.tutor_id];

    const { data: connections, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('*')
      .in('profile_id', profileIds)
      .eq('sync_enabled', true)
      .eq('status', 'active');

    if (fetchError) {
      console.error('[Calendar Sync] Failed to fetch connections:', fetchError);
      return results;
    }

    if (!connections || connections.length === 0) {
      console.log('[Calendar Sync] No active calendar connections found for booking', booking.id);
      return results;
    }

    // 2. Sync to each connection
    for (const connection of connections as CalendarConnection[]) {
      try {
        // Determine view mode based on whose calendar this is
        const viewMode = connection.profile_id === booking.client_id ? 'client' : 'tutor';

        const result = await syncToConnection(
          booking,
          connection,
          viewMode,
          action,
          supabase
        );

        results.push(result);
      } catch (error) {
        console.error(
          `[Calendar Sync] Error syncing to ${connection.provider} for ${connection.profile_id}:`,
          error
        );
        results.push({
          success: false,
          profile_id: connection.profile_id,
          provider: connection.provider,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[Calendar Sync] Fatal error in syncBookingToCalendars:', error);
    return results;
  }
}

/**
 * Sync a booking to a single calendar connection
 */
async function syncToConnection(
  booking: Booking,
  connection: CalendarConnection,
  viewMode: 'client' | 'tutor',
  action: SyncAction,
  supabase: any
): Promise<SyncResult> {
  const { provider, calendar_id, profile_id } = connection;

  // Currently only Google is supported
  if (provider !== 'google') {
    return {
      success: false,
      profile_id,
      provider,
      error: 'Provider not yet supported',
    };
  }

  // Decrypt tokens from storage
  const decryptedAccessToken = safeDecrypt(connection.access_token);
  const decryptedRefreshToken = connection.refresh_token ? safeDecrypt(connection.refresh_token) : null;

  // Get valid access token (refresh if expired)
  let accessToken: string;
  try {
    const tokenResult = await getValidAccessToken(
      decryptedAccessToken,
      decryptedRefreshToken,
      connection.token_expiry || null
    );

    accessToken = tokenResult.accessToken;

    // Update database if token was refreshed
    if (tokenResult.needsRefresh) {
      const encryptedNewToken = encryptToken(tokenResult.accessToken);

      await supabase
        .from('calendar_connections')
        .update({
          access_token: encryptedNewToken,
          token_expiry: tokenResult.newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);

      console.log(`[Calendar Sync] ✅ Refreshed access token for connection ${connection.id}`);
    }
  } catch (error) {
    console.error('[Calendar Sync] Token refresh failed:', error);

    // Mark connection as error - user needs to reconnect
    await supabase
      .from('calendar_connections')
      .update({
        status: 'error',
        last_error: 'Token expired. Please reconnect your calendar.',
      })
      .eq('id', connection.id);

    return {
      success: false,
      profile_id,
      provider,
      error: 'Token refresh failed - user must reconnect calendar',
    };
  }

  try {
    if (action === 'create') {
      // Create new calendar event
      const externalEventId = await createGoogleCalendarEvent(
        accessToken,
        booking,
        viewMode,
        calendar_id || 'primary'
      );

      // Store in calendar_events table
      const { error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          calendar_connection_id: connection.id,
          booking_id: booking.id,
          external_event_id: externalEventId,
          sync_status: 'synced',
          synced_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Calendar Sync] Failed to store event record:', insertError);
        // Event was created in Google but not recorded in DB - log for manual cleanup
        console.error('[Calendar Sync] ORPHANED EVENT:', {
          external_event_id: externalEventId,
          booking_id: booking.id,
          connection_id: connection.id,
        });
      }

      // Update last_synced_at on connection
      await supabase
        .from('calendar_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);

      console.log(
        `[Calendar Sync] ✅ Created ${provider} event for booking ${booking.id} (${viewMode})`
      );

      return { success: true, profile_id, provider };

    } else if (action === 'update') {
      // Find existing calendar event
      const { data: calendarEvent, error: findError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('calendar_connection_id', connection.id)
        .eq('booking_id', booking.id)
        .single();

      if (findError || !calendarEvent) {
        // Event doesn't exist yet - create it instead
        console.log(
          `[Calendar Sync] Event not found for update, creating instead (booking ${booking.id})`
        );
        return await syncToConnection(booking, connection, viewMode, 'create', supabase);
      }

      // Update existing event
      await updateGoogleCalendarEvent(
        accessToken,
        calendarEvent.external_event_id,
        booking,
        viewMode,
        calendar_id || 'primary'
      );

      // Update sync timestamp
      await supabase
        .from('calendar_events')
        .update({ synced_at: new Date().toISOString() })
        .eq('id', calendarEvent.id);

      await supabase
        .from('calendar_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);

      console.log(
        `[Calendar Sync] ✅ Updated ${provider} event for booking ${booking.id} (${viewMode})`
      );

      return { success: true, profile_id, provider };

    } else if (action === 'delete') {
      // Find existing calendar event
      const { data: calendarEvent, error: findError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('calendar_connection_id', connection.id)
        .eq('booking_id', booking.id)
        .single();

      if (findError || !calendarEvent) {
        // Event doesn't exist - nothing to delete
        console.log(
          `[Calendar Sync] No event found to delete for booking ${booking.id}`
        );
        return { success: true, profile_id, provider };
      }

      // Delete from Google Calendar
      await deleteGoogleCalendarEvent(
        accessToken,
        calendarEvent.external_event_id,
        calendar_id || 'primary'
      );

      // Delete from calendar_events table
      await supabase
        .from('calendar_events')
        .delete()
        .eq('id', calendarEvent.id);

      await supabase
        .from('calendar_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id);

      console.log(
        `[Calendar Sync] ✅ Deleted ${provider} event for booking ${booking.id} (${viewMode})`
      );

      return { success: true, profile_id, provider };
    }

    return {
      success: false,
      profile_id,
      provider,
      error: 'Invalid action',
    };

  } catch (error) {
    console.error(`[Calendar Sync] ${action} failed for ${provider}:`, error);

    // Update connection status if repeated failures
    await supabase
      .from('calendar_connections')
      .update({
        status: 'error',
        last_error: error instanceof Error ? error.message : 'Sync failed',
      })
      .eq('id', connection.id);

    return {
      success: false,
      profile_id,
      provider,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper to sync booking confirmation (called from Stripe webhook)
 */
export async function syncBookingConfirmation(booking: Booking): Promise<void> {
  console.log('[Calendar Sync] Syncing booking confirmation:', booking.id);
  await syncBookingToCalendars(booking, 'create');
}

/**
 * Helper to sync booking cancellation
 */
export async function syncBookingCancellation(booking: Booking): Promise<void> {
  console.log('[Calendar Sync] Syncing booking cancellation:', booking.id);
  await syncBookingToCalendars(booking, 'delete');
}

/**
 * Helper to sync booking rescheduling
 */
export async function syncBookingReschedule(booking: Booking): Promise<void> {
  console.log('[Calendar Sync] Syncing booking reschedule:', booking.id);
  await syncBookingToCalendars(booking, 'update');
}
