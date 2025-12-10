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
  agent_profile_id?: string; // Optional: if booking came from agent referral (migration 051)
}

export interface Booking {
  id: string;
  client_id: string; // Updated from student_id (migration 049)
  tutor_id: string;
  listing_id: string;
  agent_profile_id?: string; // Updated from referrer_profile_id (migration 051)
  service_name: string;
  session_start_time: string;
  session_duration: number;
  amount: number;
  status: string; // booking_status_enum
  payment_status: string; // transaction_status_enum
  booking_type?: 'direct' | 'referred' | 'agent_job'; // Added in migration 049

  // Snapshot fields from Listing (migrations 104, 108)
  subjects?: string[];
  levels?: string[];
  location_type?: 'online' | 'in_person' | 'hybrid';
  location_city?: string;
  free_trial?: boolean;
  hourly_rate?: number;
  listing_slug?: string;
  available_free_help?: boolean; // v5.9 (migration 108)

  created_at: string;
  updated_at: string;
}

/**
 * Create a new booking
 * Migration 104: Now snapshots listing data at booking creation time
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

  // Fetch listing to get snapshot fields (migrations 104, 108)
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('subjects, levels, location_type, location_city, hourly_rate, slug, free_trial, available_free_help')
    .eq('id', input.listing_id)
    .single();

  if (listingError) {
    console.warn('Warning: Could not fetch listing for snapshot fields:', listingError);
  }

  // Create booking record with snapshot fields (migrations 049, 051, 104)
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: input.listing_id,
      client_id: user.id, // Updated from student_id (migration 049)
      tutor_id: input.tutor_id,
      service_name: input.service_name,
      session_start_time: input.session_start_time,
      session_duration: input.session_duration,
      amount: input.amount,
      agent_profile_id: input.agent_profile_id, // Updated from referrer_profile_id (migration 051)
      booking_type: input.agent_profile_id ? 'referred' : 'direct', // Added in migration 049
      status: 'Pending',
      payment_status: 'Pending',

      // Snapshot fields from listing (migrations 104, 108)
      subjects: listing?.subjects,
      levels: listing?.levels,
      location_type: listing?.location_type,
      location_city: listing?.location_city,
      hourly_rate: listing?.hourly_rate,
      free_trial: listing?.free_trial || false,
      listing_slug: listing?.slug,
      available_free_help: listing?.available_free_help || false, // v5.9 (migration 108)
    })
    .select()
    .single();

  if (error) throw error;

  return data as Booking;
}

/**
 * Get all bookings for the current user based on their active role
 */
export async function getMyBookings(): Promise<any[]> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Get user's profile to determine active role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, active_role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  const activeRole = profile.active_role;

  // Build query based on active role (using correct column names from migrations 049 & 051)
  let query = supabase
    .from('bookings')
    .select(`
      *,
      client:client_id(id, full_name, avatar_url),
      tutor:tutor_id(id, full_name, avatar_url),
      listing:listing_id(id, title),
      agent:agent_profile_id(id, full_name)
    `);

  // Role-based filtering (migrations 049 & 051)
  if (activeRole === 'client') {
    query = query.eq('client_id', user.id);
  } else if (activeRole === 'tutor') {
    query = query.eq('tutor_id', user.id);
  } else if (activeRole === 'agent') {
    // Agent sees all bookings where they are involved
    query = query.or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_profile_id.eq.${user.id}`);
  }

  const { data: bookings, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;

  return bookings || [];
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
 * Get a single booking by ID with full details (client, tutor, listing, agent)
 */
export async function getBookingById(id: string): Promise<any | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      client:client_id(id, full_name, avatar_url),
      tutor:tutor_id(id, full_name, avatar_url),
      listing:listing_id(id, title),
      agent:agent_profile_id(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
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
    .eq('client_id', user.id) // Only allow clients to cancel their own bookings (migrations 049 & 051)
    .select()
    .single();

  if (error) throw error;

  return data as Booking;
}
