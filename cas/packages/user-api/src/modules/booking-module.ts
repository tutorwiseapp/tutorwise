/**
 * Booking Module
 *
 * User-facing API for scheduling and booking functionality.
 * Wraps CAS Planner agent for user consumption.
 *
 * @module cas/user-api/booking
 */

import {
  type AgentContext,
  isOperationAllowed,
  hasRole,
  createAuditEntry,
  getOrganisationId,
} from '../../../core/src/context';
import { getSupabaseClient } from '../lib/supabase';

// --- Types ---

export interface Booking {
  id: string;
  tutorId: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  clientId?: string; // Parent/guardian
  subject: string;
  scheduledAt: Date;
  duration: number; // minutes
  status: BookingStatus;
  meetingUrl?: string;
  notes?: string;
  recurring?: RecurringConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface RecurringConfig {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  endDate: Date;
  exceptions: Date[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  tutorId?: string;
}

export interface TutorAvailability {
  tutorId: string;
  tutorName: string;
  timezone: string;
  defaultDuration: number;
  slots: TimeSlot[];
  bufferBetweenLessons: number;
}

export interface BookingRequest {
  tutorId: string;
  subject: string;
  preferredSlot: Date;
  duration: number;
  notes?: string;
  recurring?: Omit<RecurringConfig, 'exceptions'>;
}

export interface RescheduleRequest {
  bookingId: string;
  newSlot: Date;
  reason?: string;
}

export interface CancellationRequest {
  bookingId: string;
  reason: string;
  notifyParties: boolean;
}

export interface TutorSearchFilters {
  subject?: string;
  level?: string;
  priceRange?: { min: number; max: number };
  availability?: {
    dayOfWeek?: number[];
    timeRange?: { start: string; end: string };
  };
  rating?: number;
  languages?: string[];
  organisationId?: string;
}

export interface TutorProfile {
  id: string;
  name: string;
  bio: string;
  subjects: string[];
  levels: string[];
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  totalLessons: number;
  languages: string[];
  timezone: string;
  avatarUrl?: string;
  badges: string[];
  availability: 'high' | 'medium' | 'low';
}

// --- Booking Module Class ---

export class BookingModuleAPI {
  /**
   * Search for tutors
   */
  async searchTutors(
    ctx: AgentContext,
    filters: TutorSearchFilters = {}
  ): Promise<{ success: boolean; tutors: TutorProfile[]; total: number; error?: string }> {
    if (!isOperationAllowed(ctx, 'tutor:search')) {
      return { success: false, tutors: [], total: 0, error: 'Permission denied' };
    }

    // Apply org filter if user belongs to an org
    const orgId = getOrganisationId(ctx);
    if (orgId) {
      filters.organisationId = orgId;
    }

    console.log(createAuditEntry(ctx, 'booking:searchTutors', filters as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, tutors: [], total: 0, error: 'Database not configured' };
    }

    try {
      // Query profiles with tutor role, joining with listings for subjects/levels
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          bio,
          avatar_url,
          timezone,
          listings!inner(
            subjects,
            levels,
            hourly_rate,
            status
          )
        `, { count: 'exact' })
        .eq('active_role', 'tutor')
        .eq('listings.status', 'published');

      // Apply subject filter via listings
      if (filters.subject) {
        query = query.contains('listings.subjects', [filters.subject]);
      }

      // Apply level filter via listings
      if (filters.level) {
        query = query.contains('listings.levels', [filters.level]);
      }

      // Apply price range filter
      if (filters.priceRange) {
        if (filters.priceRange.min) {
          query = query.gte('listings.hourly_rate', filters.priceRange.min);
        }
        if (filters.priceRange.max) {
          query = query.lte('listings.hourly_rate', filters.priceRange.max);
        }
      }

      // Apply org filter
      if (filters.organisationId) {
        query = query.eq('organisation_id', filters.organisationId);
      }

      const { data, count, error } = await query.limit(20);

      if (error) {
        console.error('[BookingModule] Search tutors error:', error);
        return { success: false, tutors: [], total: 0, error: error.message };
      }

      // Transform to TutorProfile format
      const tutors: TutorProfile[] = (data || []).map((row: any) => {
        const listing = row.listings?.[0] || {};
        return {
          id: row.id,
          name: row.full_name || 'Unknown',
          bio: row.bio || '',
          subjects: listing.subjects || [],
          levels: listing.levels || [],
          hourlyRate: listing.hourly_rate || 0,
          rating: 0, // Would aggregate from reviews
          totalReviews: 0,
          totalLessons: 0,
          languages: [],
          timezone: row.timezone || 'UTC',
          avatarUrl: row.avatar_url,
          badges: [],
          availability: 'medium',
        };
      });

      return { success: true, tutors, total: count || tutors.length };
    } catch (error) {
      console.error('[BookingModule] Search tutors error:', error);
      return { success: false, tutors: [], total: 0, error: String(error) };
    }
  }

  /**
   * Get tutor availability
   */
  async getTutorAvailability(
    ctx: AgentContext,
    tutorId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{ success: boolean; availability?: TutorAvailability; error?: string }> {
    if (!isOperationAllowed(ctx, 'tutor:view')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'booking:getTutorAvailability', { tutorId, dateRange } as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Get tutor profile and their listing availability
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          timezone,
          listings(availability)
        `)
        .eq('id', tutorId)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Tutor not found' };
      }

      // Get existing bookings in date range to exclude booked slots
      const { data: bookings } = await supabase
        .from('bookings')
        .select('session_start_time, session_duration')
        .eq('tutor_id', tutorId)
        .gte('session_start_time', dateRange.start.toISOString())
        .lte('session_start_time', dateRange.end.toISOString())
        .in('status', ['Pending', 'Confirmed']);

      // Convert listing availability to TimeSlots
      const listing = (profile as any).listings?.[0];
      const availabilityConfig = listing?.availability || {};
      const slots: TimeSlot[] = [];

      // Generate slots for each day in range
      const currentDate = new Date(dateRange.start);
      while (currentDate <= dateRange.end) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySlots = availabilityConfig[dayName] || [];

        for (const slot of daySlots) {
          const startTime = new Date(currentDate);
          const [startHour, startMin] = slot.start.split(':').map(Number);
          startTime.setHours(startHour, startMin, 0, 0);

          const endTime = new Date(currentDate);
          const [endHour, endMin] = slot.end.split(':').map(Number);
          endTime.setHours(endHour, endMin, 0, 0);

          // Check if slot conflicts with existing bookings
          const isBooked = (bookings || []).some((booking: any) => {
            const bookingStart = new Date(booking.session_start_time);
            const bookingEnd = new Date(bookingStart.getTime() + booking.session_duration * 60000);
            return startTime < bookingEnd && endTime > bookingStart;
          });

          slots.push({
            start: startTime,
            end: endTime,
            available: !isBooked,
            tutorId,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        success: true,
        availability: {
          tutorId,
          tutorName: profile.full_name || 'Tutor',
          timezone: profile.timezone || 'UTC',
          defaultDuration: 60,
          slots,
          bufferBetweenLessons: 15,
        },
      };
    } catch (error) {
      console.error('[BookingModule] Get availability error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(
    ctx: AgentContext,
    request: BookingRequest
  ): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    if (!isOperationAllowed(ctx, 'booking:create')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'booking:createBooking', request as unknown as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Get tutor's listing for the subject
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('id, hourly_rate')
        .eq('profile_id', request.tutorId)
        .eq('status', 'published')
        .contains('subjects', [request.subject])
        .single();

      if (listingError) {
        // Fallback: get any published listing for the tutor
        const { data: anyListing } = await supabase
          .from('listings')
          .select('id, hourly_rate')
          .eq('profile_id', request.tutorId)
          .eq('status', 'published')
          .limit(1)
          .single();

        if (!anyListing) {
          return { success: false, error: 'Tutor listing not found' };
        }
      }

      const listingData = listing || (await supabase
        .from('listings')
        .select('id, hourly_rate')
        .eq('profile_id', request.tutorId)
        .limit(1)
        .single()
      ).data;

      // Calculate amount based on duration and hourly rate
      const hourlyRate = listingData?.hourly_rate || 0;
      const amount = (hourlyRate * request.duration) / 60;

      // Insert booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          client_id: ctx.user?.id,
          tutor_id: request.tutorId,
          listing_id: listingData?.id,
          service_name: request.subject,
          session_start_time: request.preferredSlot.toISOString(),
          session_duration: request.duration,
          amount,
          status: 'Pending',
          payment_status: 'Pending',
          notes: request.notes,
        })
        .select(`
          *,
          tutor:profiles!tutor_id(full_name),
          client:profiles!client_id(full_name)
        `)
        .single();

      if (bookingError) {
        console.error('[BookingModule] Create booking error:', bookingError);
        return { success: false, error: bookingError.message };
      }

      // Transform to Booking format
      const result: Booking = {
        id: booking.id,
        tutorId: booking.tutor_id,
        tutorName: booking.tutor?.full_name || 'Tutor',
        studentId: booking.client_id,
        studentName: booking.client?.full_name || 'Student',
        subject: booking.service_name,
        scheduledAt: new Date(booking.session_start_time),
        duration: booking.session_duration,
        status: booking.status.toLowerCase() as BookingStatus,
        notes: booking.notes,
        createdAt: new Date(booking.created_at),
        updatedAt: new Date(booking.updated_at || booking.created_at),
      };

      return { success: true, booking: result };
    } catch (error) {
      console.error('[BookingModule] Create booking error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get user's bookings
   */
  async getBookings(
    ctx: AgentContext,
    options: {
      status?: BookingStatus[];
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ success: boolean; bookings: Booking[]; total: number; error?: string }> {
    if (!isOperationAllowed(ctx, 'booking:read:own')) {
      return { success: false, bookings: [], total: 0, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'booking:getBookings', options as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, bookings: [], total: 0, error: 'Database not configured' };
    }

    try {
      const userId = ctx.user?.id;
      if (!userId) {
        return { success: false, bookings: [], total: 0, error: 'User ID not found' };
      }

      // Build query based on user role
      let query = supabase
        .from('bookings')
        .select(`
          *,
          tutor:profiles!tutor_id(id, full_name, avatar_url),
          client:profiles!client_id(id, full_name, avatar_url)
        `, { count: 'exact' });

      // Filter by role
      if (hasRole(ctx, 'tutor')) {
        query = query.eq('tutor_id', userId);
      } else if (hasRole(ctx, 'client') || hasRole(ctx, 'student')) {
        query = query.eq('client_id', userId);
      } else if (hasRole(ctx, 'agent')) {
        query = query.or(`client_id.eq.${userId},tutor_id.eq.${userId},agent_id.eq.${userId}`);
      }

      // Apply status filter
      if (options.status && options.status.length > 0) {
        const statusValues = options.status.map(s =>
          s.charAt(0).toUpperCase() + s.slice(1) // Capitalize first letter to match DB
        );
        query = query.in('status', statusValues);
      }

      // Apply date range filter
      if (options.dateRange) {
        query = query
          .gte('session_start_time', options.dateRange.start.toISOString())
          .lte('session_start_time', options.dateRange.end.toISOString());
      }

      // Apply pagination
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      query = query
        .order('session_start_time', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error('[BookingModule] Get bookings error:', error);
        return { success: false, bookings: [], total: 0, error: error.message };
      }

      // Transform to Booking format
      const bookings: Booking[] = (data || []).map((row: any) => ({
        id: row.id,
        tutorId: row.tutor_id,
        tutorName: row.tutor?.full_name || 'Tutor',
        studentId: row.client_id,
        studentName: row.client?.full_name || 'Student',
        clientId: row.client_id,
        subject: row.service_name,
        scheduledAt: new Date(row.session_start_time),
        duration: row.session_duration,
        status: (row.status || 'pending').toLowerCase() as BookingStatus,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at || row.created_at),
      }));

      return { success: true, bookings, total: count || bookings.length };
    } catch (error) {
      console.error('[BookingModule] Get bookings error:', error);
      return { success: false, bookings: [], total: 0, error: String(error) };
    }
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(
    ctx: AgentContext,
    request: RescheduleRequest
  ): Promise<{ success: boolean; booking?: Booking; error?: string }> {
    if (!isOperationAllowed(ctx, 'booking:read:own')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'booking:rescheduleBooking', request as unknown as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Verify user owns booking
      const { data: existing, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', request.bookingId)
        .single();

      if (fetchError || !existing) {
        return { success: false, error: 'Booking not found' };
      }

      const userId = ctx.user?.id;
      if (existing.client_id !== userId && existing.tutor_id !== userId) {
        return { success: false, error: 'Not authorized to modify this booking' };
      }

      // Update booking
      const { data: booking, error: updateError } = await supabase
        .from('bookings')
        .update({
          session_start_time: request.newSlot.toISOString(),
          scheduling_status: 'rescheduled',
        })
        .eq('id', request.bookingId)
        .select()
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        booking: {
          id: booking.id,
          tutorId: booking.tutor_id,
          tutorName: '',
          studentId: booking.client_id,
          studentName: '',
          subject: booking.service_name,
          scheduledAt: new Date(booking.session_start_time),
          duration: booking.session_duration,
          status: (booking.status || 'pending').toLowerCase() as BookingStatus,
          createdAt: new Date(booking.created_at),
          updatedAt: new Date(booking.updated_at || booking.created_at),
        },
      };
    } catch (error) {
      console.error('[BookingModule] Reschedule error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    ctx: AgentContext,
    request: CancellationRequest
  ): Promise<{ success: boolean; refundAmount?: number; error?: string }> {
    if (!isOperationAllowed(ctx, 'booking:cancel:own')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'booking:cancelBooking', request as unknown as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Database not configured' };
    }

    try {
      // Verify user owns booking
      const { data: existing, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', request.bookingId)
        .single();

      if (fetchError || !existing) {
        return { success: false, error: 'Booking not found' };
      }

      const userId = ctx.user?.id;
      if (existing.client_id !== userId && existing.tutor_id !== userId) {
        return { success: false, error: 'Not authorized to cancel this booking' };
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'Cancelled',
          cancellation_reason: request.reason,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', request.bookingId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Calculate refund (simplified - actual logic would depend on policy)
      const refundAmount = existing.payment_status === 'Paid' ? existing.amount : 0;

      return { success: true, refundAmount };
    } catch (error) {
      console.error('[BookingModule] Cancel error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get upcoming lessons (for dashboard)
   */
  async getUpcomingLessons(
    ctx: AgentContext,
    limit: number = 5
  ): Promise<{ success: boolean; lessons: Booking[]; error?: string }> {
    const now = new Date();
    const result = await this.getBookings(ctx, {
      status: ['confirmed', 'pending'],
      dateRange: { start: now, end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      limit,
    });
    return { success: result.success, lessons: result.bookings, error: result.error };
  }

  /**
   * Start a lesson (generates meeting URL)
   */
  async startLesson(
    ctx: AgentContext,
    bookingId: string
  ): Promise<{ success: boolean; meetingUrl?: string; error?: string }> {
    if (!isOperationAllowed(ctx, 'lesson:attend') && !hasRole(ctx, 'tutor')) {
      return { success: false, error: 'Permission denied' };
    }

    console.log(createAuditEntry(ctx, 'booking:startLesson', { bookingId } as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      // Return mock URL if DB not available
      return {
        success: true,
        meetingUrl: `https://meet.tutorwise.com/${bookingId}`,
      };
    }

    try {
      // Update booking status and get meeting URL
      const { data: booking, error } = await supabase
        .from('bookings')
        .update({ status: 'In_Progress' })
        .eq('id', bookingId)
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        meetingUrl: `https://meet.tutorwise.com/${bookingId}`,
      };
    } catch (error) {
      console.error('[BookingModule] Start lesson error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Complete a lesson and request feedback
   */
  async completeLesson(
    ctx: AgentContext,
    bookingId: string,
    summary?: {
      notes?: string;
      homework?: string[];
      topicsCovered?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!hasRole(ctx, 'tutor') && !hasRole(ctx, 'agent')) {
      return { success: false, error: 'Only tutors can complete lessons' };
    }

    console.log(createAuditEntry(ctx, 'booking:completeLesson', { bookingId, summary } as Record<string, unknown>));

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: true }; // Return success if DB not available (mock mode)
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
          lesson_notes: summary?.notes,
        })
        .eq('id', bookingId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('[BookingModule] Complete lesson error:', error);
      return { success: false, error: String(error) };
    }
  }
}

export const bookingModule = new BookingModuleAPI();

export default BookingModuleAPI;
