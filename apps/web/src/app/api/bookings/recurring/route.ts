/**
 * Filename: apps/web/src/app/api/bookings/recurring/route.ts
 * Purpose: API endpoints for creating and managing recurring booking series
 * Created: 2026-02-07
 *
 * Allows clients to create recurring sessions (weekly, biweekly, monthly)
 * and view their active recurring series.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  createRecurringSeries,
  generateFutureInstances,
  type RecurrencePattern,
  type CreateSeriesInput,
} from '@/lib/scheduling/recurring-sessions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/recurring
 * Lists recurring series for the authenticated user
 * Query params:
 *  - role: 'client' or 'tutor' (optional, defaults to user's active role)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get query params
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role') || 'client';

    // 3. Fetch series based on role
    let query = supabase
      .from('recurring_booking_series')
      .select(`
        *,
        parent_booking:bookings!parent_booking_id(
          id,
          service_name,
          session_duration,
          session_start_time,
          amount,
          subjects,
          delivery_mode,
          location_city
        )
      `)
      .order('created_at', { ascending: false });

    if (role === 'client') {
      query = query.eq('client_id', user.id);
    } else {
      query = query.eq('tutor_id', user.id);
    }

    const { data: series, error } = await query;

    if (error) {
      console.error('[Recurring API] Fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recurring series' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      series: series || [],
      count: series?.length || 0,
    });
  } catch (error) {
    console.error('[Recurring API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/recurring
 * Creates a new recurring booking series
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      tutor_id,
      template_booking,
      first_session_time,
      recurrence_pattern,
      auto_generate_count,
    } = body;

    // 3. Validate required fields
    if (!tutor_id || !template_booking || !first_session_time || !recurrence_pattern) {
      return NextResponse.json(
        {
          error: 'Missing required fields: tutor_id, template_booking, first_session_time, recurrence_pattern',
        },
        { status: 400 }
      );
    }

    // 4. Verify user is the client
    // (In a real app, you might allow tutors to create series too)
    const client_id = user.id;

    // 5. Create the series
    const input: CreateSeriesInput = {
      client_id,
      tutor_id,
      template_booking,
      first_session_time: new Date(first_session_time),
      recurrence_pattern: recurrence_pattern as RecurrencePattern,
    };

    const { series, first_booking_id } = await createRecurringSeries(input);

    // 6. Optionally auto-generate future instances
    let generatedInstances: string[] = [];
    if (auto_generate_count && auto_generate_count > 1) {
      generatedInstances = await generateFutureInstances(
        series.id,
        auto_generate_count - 1 // Minus 1 because first booking is already created
      );
    }

    return NextResponse.json({
      success: true,
      series,
      first_booking_id,
      generated_instances: generatedInstances,
      total_bookings: 1 + generatedInstances.length,
      message: `Recurring series created with ${1 + generatedInstances.length} bookings`,
    });
  } catch (error) {
    console.error('[Recurring API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
