/**
 * Filename: apps/web/src/lib/services/BookingService.ts
 * Purpose: Business logic for booking operations (v5.0)
 * Created: 2025-11-14
 * Pattern: Service Layer (API Solution Design v5.1)
 */

import { createClient } from '@/utils/supabase/server';
import { ProfileGraphService } from './ProfileGraphService';

/**
 * Booking status enum
 */
export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

/**
 * Payment status enum
 */
export type PaymentStatus = 'Pending' | 'Completed' | 'Failed' | 'Refunded';

/**
 * Booking type enum
 */
export type BookingType = 'direct' | 'referred' | 'agent_job';

/**
 * Booking data interface
 */
export interface BookingData {
  id: string;
  client_id: string;
  student_id?: string; // v5.0: Added student_id for guardian-student link
  tutor_id: string;
  listing_id: string;
  agent_profile_id?: string;
  service_name: string;
  session_start_time: string;
  session_duration: number;
  amount: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  booking_type?: BookingType;
  created_at: string;
  updated_at: string;
}

/**
 * Create booking input
 */
export interface CreateBookingInput {
  listing_id: string;
  tutor_id: string;
  service_name: string;
  session_start_time: string;
  session_duration: number;
  amount: number;
  agent_profile_id?: string;
}

/**
 * Assign student input
 */
export interface AssignStudentInput {
  booking_id: string;
  student_id: string;
}

/**
 * BookingService
 * Encapsulates all business logic for booking operations
 */
export class BookingService {
  /**
   * Get all bookings for a user based on their active role
   */
  static async getMyBookings(userId: string, activeRole: string): Promise<any[]> {
    const supabase = await createClient();

    let query = supabase
      .from('bookings')
      .select(`
        *,
        client:client_id(id, full_name, avatar_url),
        tutor:tutor_id(id, full_name, avatar_url),
        listing:listing_id(id, title),
        agent:agent_profile_id(id, full_name),
        student:student_id(id, full_name, avatar_url)
      `);

    // Role-based filtering
    if (activeRole === 'client') {
      query = query.eq('client_id', userId);
    } else if (activeRole === 'tutor') {
      query = query.eq('tutor_id', userId);
    } else if (activeRole === 'agent') {
      // Agent sees all bookings where they are involved
      query = query.or(`client_id.eq.${userId},tutor_id.eq.${userId},agent_profile_id.eq.${userId}`);
    }

    const { data: bookings, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return bookings || [];
  }

  /**
   * Get a single booking by ID
   */
  static async getBooking(bookingId: string): Promise<BookingData | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as BookingData;
  }

  /**
   * Create a new booking
   */
  static async createBooking(userId: string, input: CreateBookingInput): Promise<BookingData> {
    const supabase = await createClient();

    // Validate required fields
    if (!input.service_name || !input.session_start_time || !input.session_duration || !input.amount) {
      throw new Error('service_name, session_start_time, session_duration, and amount are required');
    }

    // Create booking record
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        listing_id: input.listing_id,
        client_id: userId,
        tutor_id: input.tutor_id,
        service_name: input.service_name,
        session_start_time: input.session_start_time,
        session_duration: input.session_duration,
        amount: input.amount,
        agent_profile_id: input.agent_profile_id,
        booking_type: input.agent_profile_id ? 'referred' : 'direct',
        status: 'Pending',
        payment_status: 'Pending',
      })
      .select()
      .single();

    if (error) throw error;

    return data as BookingData;
  }

  /**
   * Assign a student to a booking (v5.0: Student Onboarding feature)
   * Validates that the guardian-student link exists before assigning
   */
  static async assignStudent({
    bookingId,
    clientId,
    studentId,
  }: {
    bookingId: string;
    clientId: string;
    studentId: string;
  }): Promise<BookingData> {
    const supabase = await createClient();

    // 1. Verify booking exists and user is the client
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.client_id !== clientId) {
      throw new Error('Unauthorized: You can only assign students to your own bookings');
    }

    // 2. Validate guardian-student link exists (v4.6: profile_graph)
    const isValidLink = await ProfileGraphService.validateLink(clientId, studentId);
    if (!isValidLink) {
      throw new Error('Invalid guardian-student link. Please add the student to your account first.');
    }

    // 3. Assign student to booking
    const { data, error } = await supabase
      .from('bookings')
      .update({ student_id: studentId })
      .eq('id', bookingId)
      .eq('client_id', clientId)
      .select()
      .single();

    if (error) throw error;

    return data as BookingData;
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string, userId: string): Promise<BookingData> {
    const supabase = await createClient();

    // Verify user owns the booking
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }
    if (booking.client_id !== userId) {
      throw new Error('Unauthorized: You can only cancel your own bookings');
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId)
      .eq('client_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data as BookingData;
  }

  /**
   * Validate access to a booking
   * Returns true if user has access to the booking
   */
  static async validateAccess(bookingId: string, userId: string): Promise<boolean> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return false;

    // User has access if they are the client, tutor, or agent
    return (
      booking.client_id === userId ||
      booking.tutor_id === userId ||
      booking.agent_profile_id === userId
    );
  }
}
