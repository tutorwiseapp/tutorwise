/**
 * Bookings API utilities
 * Handles booking creation and management
 */

import { createClient } from '@/utils/supabase/client';
import type { ServiceType } from '@tutorwise/shared-types';

export interface CreateBookingInput {
  listing_id: string;
  tutor_id: string;
  service_name: string; // Required: name of the service being booked
  session_start_time: string; // Required: ISO 8601 timestamp
  session_duration: number; // Required: duration in minutes
  amount: number; // Required: booking amount
  referrer_profile_id?: string; // Optional: if booking came from referral
}

export interface Booking {
  id: string;
  student_id: string;
  tutor_id: string;
  listing_id: string;
  referrer_profile_id?: string;
  service_name: string;
  session_start_time: string;
  session_duration: number;
  amount: number;
  status: string; // booking_status_enum
  payment_status: string; // transaction_status_enum
  created_at: string;
  updated_at: string;
}

/**
 * Create a new booking
 */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Validate required fields
  if (!input.service_name || !input.session_start_time || !input.session_duration || !input.amount) {
    throw new Error('service_name, session_start_time, session_duration, and amount are required');
  }

  // Create booking record matching the actual database schema
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: input.listing_id,
      student_id: user.id,
      tutor_id: input.tutor_id,
      service_name: input.service_name,
      session_start_time: input.session_start_time,
      session_duration: input.session_duration,
      amount: input.amount,
      referrer_profile_id: input.referrer_profile_id,
      status: 'Pending',
      payment_status: 'Pending',
    })
    .select()
    .single();

  if (error) throw error;

  return data as Booking;
}

/**
 * Get all bookings for the current user
 * @param role - Either 'tutor' or 'student' to determine which bookings to fetch
 */
export async function getMyBookings(role: 'tutor' | 'student' = 'student'): Promise<any[]> {
  // Use the API route which handles the complex joins and relationships
  const response = await fetch(`/api/bookings?role=${role}`);

  if (!response.ok) {
    throw new Error('Failed to fetch bookings');
  }

  const data = await response.json();
  return data.bookings || [];
}

/**
 * Get a single booking by ID
 */
export async function getBooking(id: string): Promise<Booking | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as Booking;
}

/**
 * Cancel a booking
 */
export async function cancelBooking(id: string): Promise<Booking> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('student_id', user.id) // Only allow students to cancel their own bookings
    .select()
    .single();

  if (error) throw error;

  return data as Booking;
}
