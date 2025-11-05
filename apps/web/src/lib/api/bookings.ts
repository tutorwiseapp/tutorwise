/**
 * Bookings API utilities
 * Handles booking creation and management
 */

import { createClient } from '@/utils/supabase/client';
import type { ServiceType } from '@tutorwise/shared-types';

export interface CreateBookingInput {
  listing_id: string;
  tutor_id: string;
  service_type: ServiceType;
  booking_date?: string; // For one-to-one and group sessions
  booking_time?: string; // For one-to-one and group sessions
  session_duration?: number; // In minutes
  attendee_count?: number; // For group sessions
  notes?: string; // Optional message to tutor
}

export interface Booking {
  id: string;
  listing_id: string;
  student_id: string;
  tutor_id: string;
  service_type: ServiceType;
  booking_date?: string;
  booking_time?: string;
  session_duration?: number;
  attendee_count?: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
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

  // Validate input based on service type
  if (
    (input.service_type === 'one-to-one' || input.service_type === 'group-session') &&
    (!input.booking_date || !input.booking_time)
  ) {
    throw new Error('booking_date and booking_time are required for one-to-one and group sessions');
  }

  // Create booking record
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: input.listing_id,
      student_id: user.id,
      tutor_id: input.tutor_id,
      service_type: input.service_type,
      booking_date: input.booking_date,
      booking_time: input.booking_time,
      session_duration: input.session_duration,
      attendee_count: input.attendee_count,
      notes: input.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  return data as Booking;
}

/**
 * Get all bookings for the current user (as student)
 */
export async function getMyBookings(): Promise<Booking[]> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []) as Booking[];
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
