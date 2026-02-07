/**
 * Filename: apps/web/src/lib/reminders/reminder-scheduler.ts
 * Purpose: Utilities for scheduling and sending booking reminders
 * Created: 2026-02-07
 *
 * Manages multi-interval reminder system (24h, 1h, 15min before sessions)
 * with automatic scheduling and delivery tracking.
 */

import { createClient } from '@/utils/supabase/server';
import { sendSessionReminderEmail, type BookingEmailData } from '@/lib/email-templates/booking';

export type ReminderType = '24h' | '1h' | '15min';
export type DeliveryMethod = 'email' | 'push' | 'sms';
export type ReminderStatus = 'pending' | 'sent' | 'failed';

export interface BookingReminder {
  id: string;
  booking_id: string;
  reminder_type: ReminderType;
  sent_at: string | null;
  delivery_method: DeliveryMethod;
  status: ReminderStatus;
  created_at: string;
}

export interface ReminderScheduleOptions {
  /** Delivery methods to use (default: ['email']) */
  methods?: DeliveryMethod[];
  /** Reminder types to schedule (default: all) */
  types?: ReminderType[];
}

/**
 * Gets the time offset in minutes for each reminder type
 */
export function getReminderOffset(type: ReminderType): number {
  switch (type) {
    case '24h':
      return 24 * 60; // 1440 minutes
    case '1h':
      return 60;      // 60 minutes
    case '15min':
      return 15;      // 15 minutes
  }
}

/**
 * Schedules all reminders for a booking when it's confirmed
 *
 * @param bookingId Booking ID
 * @param sessionStartTime Session start time
 * @param options Scheduling options
 * @returns Array of created reminder records
 */
export async function scheduleBookingReminders(
  bookingId: string,
  sessionStartTime: Date,
  options: ReminderScheduleOptions = {}
): Promise<BookingReminder[]> {
  const supabase = await createClient();

  const methods = options.methods || ['email'];
  const types: ReminderType[] = options.types || ['24h', '1h', '15min'];

  // Create reminder records for each type and method
  const reminders = [];
  for (const type of types) {
    for (const method of methods) {
      reminders.push({
        booking_id: bookingId,
        reminder_type: type,
        delivery_method: method,
        status: 'pending' as ReminderStatus,
      });
    }
  }

  const { data, error } = await supabase
    .from('booking_reminders')
    .insert(reminders)
    .select();

  if (error) {
    console.error('[Reminder Scheduler] Failed to schedule reminders:', error);
    throw new Error('Failed to schedule reminders');
  }

  return (data || []) as BookingReminder[];
}

/**
 * Gets reminders that are due to be sent within a time window
 *
 * @param reminderType Type of reminder to fetch
 * @param windowMinutes Time window in minutes (e.g., 60 for 1h window)
 * @returns Array of bookings with due reminders
 */
export async function getUpcomingReminders(
  reminderType: ReminderType,
  windowMinutes: number
): Promise<Array<{
  reminder_id: string;
  booking_id: string;
  session_start_time: string;
  tutor_name: string;
  tutor_email: string;
  client_name: string;
  client_email: string;
  service_name: string;
  delivery_mode: string;
  location_city?: string;
  session_duration: number;
}>> {
  const supabase = await createClient();

  const offsetMinutes = getReminderOffset(reminderType);
  const now = new Date();

  // Calculate the time range for reminders
  // E.g., for 24h reminders with 60min window: sessions starting in 23h-25h
  const reminderTimeStart = new Date(now.getTime() + (offsetMinutes - windowMinutes / 2) * 60000);
  const reminderTimeEnd = new Date(now.getTime() + (offsetMinutes + windowMinutes / 2) * 60000);

  // Query bookings with pending reminders in the time window
  const { data, error } = await supabase
    .from('booking_reminders')
    .select(`
      id,
      booking_id,
      bookings!inner (
        id,
        session_start_time,
        service_name,
        session_duration,
        delivery_mode,
        location_city,
        status,
        tutor:profiles!tutor_id (full_name, email),
        client:profiles!client_id (full_name, email)
      )
    `)
    .eq('reminder_type', reminderType)
    .eq('status', 'pending')
    .gte('bookings.session_start_time', reminderTimeStart.toISOString())
    .lte('bookings.session_start_time', reminderTimeEnd.toISOString())
    .in('bookings.status', ['Confirmed']); // Only send reminders for confirmed bookings

  if (error) {
    console.error('[Reminder Scheduler] Failed to fetch upcoming reminders:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Transform data into flat structure
  return data.map((item: any) => ({
    reminder_id: item.id,
    booking_id: item.booking_id,
    session_start_time: item.bookings.session_start_time,
    tutor_name: item.bookings.tutor?.full_name || 'Your Tutor',
    tutor_email: item.bookings.tutor?.email || '',
    client_name: item.bookings.client?.full_name || 'Your Client',
    client_email: item.bookings.client?.email || '',
    service_name: item.bookings.service_name,
    delivery_mode: item.bookings.delivery_mode,
    location_city: item.bookings.location_city,
    session_duration: item.bookings.session_duration,
  }));
}

/**
 * Sends a reminder email and marks it as sent
 *
 * @param reminderId Reminder record ID
 * @param reminderData Reminder data
 * @returns true if sent successfully
 */
export async function sendReminder(
  reminderId: string,
  reminderData: {
    booking_id: string;
    session_start_time: string;
    tutor_name: string;
    tutor_email: string;
    client_name: string;
    client_email: string;
    service_name: string;
    delivery_mode: string;
    location_city?: string;
    session_duration: number;
  }
): Promise<boolean> {
  const supabase = await createClient();

  try {
    // Prepare booking data for email
    const emailData: BookingEmailData = {
      bookingId: reminderData.booking_id,
      sessionDate: new Date(reminderData.session_start_time),
      serviceName: reminderData.service_name,
      sessionDuration: reminderData.session_duration,
      amount: 0, // Not needed for reminders
      deliveryMode: reminderData.delivery_mode as 'online' | 'in_person' | 'hybrid',
      locationCity: reminderData.location_city,
      tutorName: reminderData.tutor_name,
      tutorEmail: reminderData.tutor_email,
      clientName: reminderData.client_name,
      clientEmail: reminderData.client_email,
    };

    // Send reminder emails to both tutor and client
    await Promise.all([
      sendSessionReminderEmail(emailData, 'client'),
      sendSessionReminderEmail(emailData, 'tutor'),
    ]);

    // Mark reminder as sent
    const { error } = await supabase
      .from('booking_reminders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminderId);

    if (error) {
      console.error('[Reminder Scheduler] Failed to update reminder status:', error);
      return false;
    }

    console.log(`[Reminder Scheduler] Sent reminder ${reminderId} for booking ${reminderData.booking_id}`);
    return true;
  } catch (error) {
    console.error('[Reminder Scheduler] Failed to send reminder:', error);

    // Mark reminder as failed
    await supabase
      .from('booking_reminders')
      .update({
        status: 'failed',
      })
      .eq('id', reminderId);

    return false;
  }
}

/**
 * Cancels all pending reminders for a booking
 * Used when a booking is cancelled or rescheduled
 *
 * @param bookingId Booking ID
 * @returns Number of reminders cancelled
 */
export async function cancelBookingReminders(bookingId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('booking_reminders')
    .delete()
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .select();

  if (error) {
    console.error('[Reminder Scheduler] Failed to cancel reminders:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Reschedules reminders for a booking with a new start time
 *
 * @param bookingId Booking ID
 * @param newStartTime New session start time
 * @returns Array of rescheduled reminders
 */
export async function rescheduleBookingReminders(
  bookingId: string,
  newStartTime: Date
): Promise<BookingReminder[]> {
  // Cancel existing pending reminders
  await cancelBookingReminders(bookingId);

  // Schedule new reminders
  return scheduleBookingReminders(bookingId, newStartTime);
}

/**
 * Gets reminder statistics for a booking
 *
 * @param bookingId Booking ID
 * @returns Reminder statistics
 */
export async function getBookingReminderStats(bookingId: string): Promise<{
  total: number;
  sent: number;
  pending: number;
  failed: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('booking_reminders')
    .select('status')
    .eq('booking_id', bookingId);

  if (error || !data) {
    return { total: 0, sent: 0, pending: 0, failed: 0 };
  }

  return {
    total: data.length,
    sent: data.filter((r) => r.status === 'sent').length,
    pending: data.filter((r) => r.status === 'pending').length,
    failed: data.filter((r) => r.status === 'failed').length,
  };
}
