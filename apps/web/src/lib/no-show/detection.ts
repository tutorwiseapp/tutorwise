/**
 * Filename: apps/web/src/lib/no-show/detection.ts
 * Purpose: Utilities for detecting and managing no-show incidents
 * Created: 2026-02-07
 *
 * Provides automatic detection of no-shows and alert system for
 * bookings that haven't started after grace period.
 */

import { createClient } from '@/utils/supabase/server';
import { sendNoShowAlertEmail } from '@/lib/email-templates/booking';

export type NoShowParty = 'client' | 'tutor';
export type NoShowStatus = 'pending_review' | 'confirmed' | 'disputed';

export interface NoShowReport {
  id: string;
  booking_id: string;
  reported_by: string | null;
  reported_at: string;
  no_show_party: NoShowParty;
  status: NoShowStatus;
  admin_notes: string | null;
  auto_resolved_at: string | null;
}

/**
 * Grace period in minutes after session start time before auto-detection
 */
export const NO_SHOW_GRACE_PERIOD_MINUTES = 30;

/**
 * Detects potential no-shows by finding confirmed bookings that:
 * - Started more than grace period ago
 * - Have not been completed
 * - Have not been reported as no-show
 *
 * @returns Array of booking IDs that are potential no-shows
 */
export async function detectPotentialNoShows(): Promise<string[]> {
  const supabase = await createClient();

  // Calculate cutoff time (grace period ago)
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - NO_SHOW_GRACE_PERIOD_MINUTES * 60000);

  // Find confirmed bookings that are past their start time + grace period
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'Confirmed')
    .eq('scheduling_status', 'scheduled')
    .lt('session_start_time', cutoffTime.toISOString());

  if (error) {
    console.error('[No-Show Detection] Database error:', error);
    return [];
  }

  if (!bookings || bookings.length === 0) {
    return [];
  }

  // Filter out bookings that already have no-show reports
  const bookingIds = bookings.map(b => b.id);

  const { data: existingReports, error: reportsError } = await supabase
    .from('no_show_reports')
    .select('booking_id')
    .in('booking_id', bookingIds);

  if (reportsError) {
    console.error('[No-Show Detection] Reports check error:', reportsError);
    return bookingIds; // Return all if we can't check reports
  }

  const reportedBookingIds = new Set(
    (existingReports || []).map(r => r.booking_id)
  );

  // Return bookings without existing reports
  return bookingIds.filter(id => !reportedBookingIds.has(id));
}

/**
 * Automatically marks a booking as potential no-show and creates a report
 *
 * @param bookingId Booking ID
 * @returns Created no-show report
 */
export async function autoMarkAsNoShow(bookingId: string): Promise<NoShowReport | null> {
  const supabase = await createClient();

  try {
    // Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        session_start_time,
        service_name,
        status,
        client_id,
        tutor_id,
        client:profiles!client_id(full_name, email),
        tutor:profiles!tutor_id(full_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('[No-Show Detection] Booking not found:', bookingId);
      return null;
    }

    // Create no-show report (initially for both parties to review)
    const { data: report, error: createError } = await supabase
      .from('no_show_reports')
      .insert({
        booking_id: bookingId,
        reported_by: null, // Auto-detected, not manually reported
        no_show_party: 'client', // Default assumption, can be disputed
        status: 'pending_review',
        auto_resolved_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('[No-Show Detection] Failed to create report:', createError);
      return null;
    }

    console.log('[No-Show Detection] Auto-created no-show report:', report.id);
    return report as NoShowReport;
  } catch (error) {
    console.error('[No-Show Detection] Error:', error);
    return null;
  }
}

/**
 * Sends alert emails to both parties about potential no-show
 *
 * @param bookingId Booking ID
 * @returns true if alerts sent successfully
 */
export async function sendNoShowAlert(bookingId: string): Promise<boolean> {
  const supabase = await createClient();

  try {
    // Get booking details
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        session_start_time,
        service_name,
        session_duration,
        client:profiles!client_id(full_name, email),
        tutor:profiles!tutor_id(full_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('[No-Show Detection] Booking not found:', bookingId);
      return false;
    }

    // Type assertion for Supabase relationship (single object, not array)
    const client = booking.client as unknown as { full_name: string; email: string } | null;
    const tutor = booking.tutor as unknown as { full_name: string; email: string } | null;

    // Send alert emails
    if (client?.email && tutor?.email) {
      try {
        await sendNoShowAlertEmail({
          bookingId: booking.id,
          serviceName: booking.service_name,
          sessionDate: new Date(booking.session_start_time),
          sessionDuration: booking.session_duration,
          clientName: client.full_name || 'Client',
          clientEmail: client.email,
          tutorName: tutor.full_name || 'Tutor',
          tutorEmail: tutor.email,
          noShowParty: 'client',
          detectedAt: new Date(),
        });

        console.log('[No-Show Detection] Alert emails sent for booking:', bookingId);
        return true;
      } catch (emailError) {
        console.error('[No-Show Detection] Failed to send emails:', emailError);
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('[No-Show Detection] Error sending alert:', error);
    return false;
  }
}

/**
 * Creates a manual no-show report
 *
 * @param bookingId Booking ID
 * @param reportedBy User ID of person reporting
 * @param noShowParty Who didn't show up
 * @returns Created no-show report
 */
export async function createNoShowReport(
  bookingId: string,
  reportedBy: string,
  noShowParty: NoShowParty
): Promise<NoShowReport> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('no_show_reports')
    .insert({
      booking_id: bookingId,
      reported_by: reportedBy,
      no_show_party: noShowParty,
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) {
    console.error('[No-Show] Failed to create report:', error);
    throw new Error('Failed to create no-show report');
  }

  return data as NoShowReport;
}

/**
 * Updates a no-show report status
 *
 * @param reportId Report ID
 * @param status New status
 * @param adminNotes Optional admin notes
 * @returns Updated report
 */
export async function updateNoShowReport(
  reportId: string,
  status: NoShowStatus,
  adminNotes?: string
): Promise<NoShowReport> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('no_show_reports')
    .update({
      status,
      admin_notes: adminNotes,
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    console.error('[No-Show] Failed to update report:', error);
    throw new Error('Failed to update no-show report');
  }

  return data as NoShowReport;
}

/**
 * Gets no-show report for a booking
 *
 * @param bookingId Booking ID
 * @returns No-show report if exists
 */
export async function getBookingNoShowReport(
  bookingId: string
): Promise<NoShowReport | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('no_show_reports')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error) {
    // No report found is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[No-Show] Failed to fetch report:', error);
    return null;
  }

  return data as NoShowReport;
}
