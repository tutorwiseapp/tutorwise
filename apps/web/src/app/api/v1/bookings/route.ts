/**
 * GET /api/v1/bookings
 * Purpose: Get authenticated user's bookings (Platform API endpoint)
 * Authentication: API key required (Bearer token)
 * Scope: bookings:read
 *
 * Use Cases:
 * - AI assistant: "Show me my upcoming tutoring sessions"
 * - Analytics tool: "Calculate my total spending on tutoring"
 * - Automated reports: Daily booking summaries
 * - Calendar integration: Sync bookings to external calendar
 *
 * Special Features:
 * - Returns only authenticated user's bookings (respects RLS)
 * - Filter by status, date range, role (tutor/client)
 * - Pagination support
 * - Includes tutor and client profile data
 */

import { withApiAuth } from '@/middleware/api-auth';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiAuth(
    request,
    async (authContext) => {
      const supabase = await createClient();
      const { searchParams } = new URL(request.url);

      // Parse query parameters
      const status = searchParams.get('status'); // scheduled, completed, cancelled, pending_log
      const days = parseInt(searchParams.get('days') || '90');
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const role = searchParams.get('role'); // 'tutor' or 'client'

      // Validate parameters
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          {
            error: 'invalid_parameter',
            message: 'limit must be between 1 and 100',
            parameter: 'limit',
            value: limit,
          },
          { status: 400 }
        );
      }

      if (offset < 0) {
        return NextResponse.json(
          {
            error: 'invalid_parameter',
            message: 'offset must be >= 0',
            parameter: 'offset',
            value: offset,
          },
          { status: 400 }
        );
      }

      // Calculate date filter
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build bookings query
      // Note: We need to check if user is tutor or client for each booking
      // User is tutor if they own the listing
      // User is client if they are the client_id

      let query = supabase
        .from('bookings')
        .select(
          `
          id,
          listing_id,
          client_id,
          status,
          start_time,
          end_time,
          duration_hours,
          price,
          recording_url,
          created_at,
          completed_at,
          cancelled_at,
          listings:listing_id (
            id,
            title,
            profile_id,
            price_per_hour,
            profiles:profile_id (
              id,
              full_name,
              avatar_url
            )
          ),
          clients:client_id (
            id,
            full_name,
            avatar_url
          )
        `,
          { count: 'exact' }
        )
        .gte('created_at', startDate.toISOString())
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }

      // Note: Role filtering (tutor/client) needs to be done post-query
      // because it depends on whether user owns the listing or is the client

      const { data: bookings, count, error } = await query;

      if (error) {
        console.error('Bookings query error:', error);
        return NextResponse.json(
          {
            error: 'query_failed',
            message: 'Failed to fetch bookings',
          },
          { status: 500 }
        );
      }

      // Filter bookings based on role
      let filteredBookings = (bookings || []).filter((booking: any) => {
        const isTutor = booking.listings?.profile_id === authContext.profileId;
        const isClient = booking.client_id === authContext.profileId;

        // User must be either tutor or client
        if (!isTutor && !isClient) {
          return false;
        }

        // Apply role filter if specified
        if (role === 'tutor' && !isTutor) return false;
        if (role === 'client' && !isClient) return false;

        return true;
      });

      // Format response
      const formattedBookings = filteredBookings.map((booking: any) => {
        const isTutor = booking.listings?.profile_id === authContext.profileId;

        return {
          id: booking.id,
          listing_id: booking.listing_id,
          listing_title: booking.listings?.title,
          tutor: {
            id: booking.listings?.profiles?.id,
            full_name: booking.listings?.profiles?.full_name,
            avatar_url: booking.listings?.profiles?.avatar_url,
          },
          client: {
            id: booking.clients?.id,
            full_name: booking.clients?.full_name,
            avatar_url: booking.clients?.avatar_url,
          },
          user_role: isTutor ? 'tutor' : 'client',
          status: booking.status,
          start_time: booking.start_time,
          end_time: booking.end_time,
          duration_hours: parseFloat(booking.duration_hours || '0'),
          price: parseFloat(booking.price || '0'),
          currency: 'GBP',
          recording_url: booking.recording_url,
          created_at: booking.created_at,
          completed_at: booking.completed_at,
          cancelled_at: booking.cancelled_at,
        };
      });

      return NextResponse.json({
        success: true,
        bookings: formattedBookings,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
          returned: formattedBookings.length,
        },
        filters: {
          status: status || null,
          days,
          role: role || null,
        },
      });
    },
    {
      requiredScopes: ['bookings:read'],
    }
  );
}
