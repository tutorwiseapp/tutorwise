/**
 * Filename: apps/web/src/app/api/bookings/recurring/[id]/route.ts
 * Purpose: API endpoints for managing individual recurring series
 * Created: 2026-02-07
 *
 * Allows users to view, pause, resume, cancel, or generate more instances
 * of a specific recurring series.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  getSeriesInstances,
  generateFutureInstances,
  pauseRecurringSeries,
  resumeRecurringSeries,
  cancelRecurringSeries,
} from '@/lib/scheduling/recurring-sessions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/recurring/[id]
 * Gets details of a recurring series including all instances
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: seriesId } = await params;

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get series details
    const { data: series, error: seriesError } = await supabase
      .from('recurring_booking_series')
      .select('*')
      .eq('id', seriesId)
      .single();

    if (seriesError || !series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    // 3. Verify user is authorized
    if (user.id !== series.client_id && user.id !== series.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to view this series' },
        { status: 403 }
      );
    }

    // 4. Get all instances
    const instances = await getSeriesInstances(seriesId);

    return NextResponse.json({
      series,
      instances,
      instance_count: instances.length,
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
 * PATCH /api/bookings/recurring/[id]
 * Updates a recurring series (pause, resume, or generate more instances)
 * Body: { action: 'pause' | 'resume' | 'generate', count?: number }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: seriesId } = await params;

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
    const { action, count } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    // 3. Get series and verify authorization
    const { data: series, error: seriesError } = await supabase
      .from('recurring_booking_series')
      .select('client_id, tutor_id, status')
      .eq('id', seriesId)
      .single();

    if (seriesError || !series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    if (user.id !== series.client_id && user.id !== series.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to modify this series' },
        { status: 403 }
      );
    }

    // 4. Perform action
    let result: any = {};

    switch (action) {
      case 'pause':
        await pauseRecurringSeries(seriesId);
        result = { message: 'Series paused successfully', status: 'paused' };
        break;

      case 'resume':
        await resumeRecurringSeries(seriesId);
        result = { message: 'Series resumed successfully', status: 'active' };
        break;

      case 'generate':
        const generateCount = count || 4;
        const generatedIds = await generateFutureInstances(seriesId, generateCount);
        result = {
          message: `Generated ${generatedIds.length} new instances`,
          generated_booking_ids: generatedIds,
          count: generatedIds.length,
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: pause, resume, or generate' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
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
 * DELETE /api/bookings/recurring/[id]
 * Cancels a recurring series (marks all future instances as cancelled)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: seriesId } = await params;

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get series and verify authorization
    const { data: series, error: seriesError } = await supabase
      .from('recurring_booking_series')
      .select('client_id, tutor_id')
      .eq('id', seriesId)
      .single();

    if (seriesError || !series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    // Only client can cancel the series
    if (user.id !== series.client_id) {
      return NextResponse.json(
        { error: 'Only the client can cancel a recurring series' },
        { status: 403 }
      );
    }

    // 3. Cancel the series
    const cancelledCount = await cancelRecurringSeries(seriesId);

    return NextResponse.json({
      success: true,
      message: `Series cancelled successfully. ${cancelledCount} future instances were cancelled.`,
      cancelled_count: cancelledCount,
    });
  } catch (error) {
    console.error('[Recurring API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
