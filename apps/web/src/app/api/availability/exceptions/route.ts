/**
 * Filename: apps/web/src/app/api/availability/exceptions/route.ts
 * Purpose: API endpoints for managing tutor availability exceptions
 * Created: 2026-02-07
 *
 * Allows tutors to create, view, and delete exceptions (holidays, vacations)
 * that block booking availability.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  createException,
  deleteException,
  getMyExceptions,
  getTutorExceptions,
  bulkCreateExceptions,
  getUKBankHolidays,
  type CreateExceptionInput,
  type ExceptionType,
} from '@/lib/availability/exceptions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/availability/exceptions
 * Fetches exceptions for the authenticated tutor
 * Query params:
 *  - tutor_id (optional): Fetch exceptions for specific tutor (public view)
 *  - start_date (optional): Filter by start date
 *  - end_date (optional): Filter by end date
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

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get('tutor_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 3. Fetch exceptions
    let exceptions;

    if (tutorId && startDate && endDate) {
      // Public view: fetch specific tutor's exceptions for date range
      exceptions = await getTutorExceptions(tutorId, startDate, endDate);
    } else {
      // Private view: fetch authenticated tutor's all exceptions
      exceptions = await getMyExceptions();
    }

    return NextResponse.json({ exceptions });
  } catch (error) {
    console.error('[Availability Exceptions API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/availability/exceptions
 * Creates a new availability exception
 * Body: CreateExceptionInput or { bulk: true, exceptions: CreateExceptionInput[] }
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

    // Check if bulk import
    if (body.bulk && body.exceptions) {
      // Bulk create
      const exceptions = await bulkCreateExceptions(
        body.exceptions.map((e: any) => ({
          ...e,
          tutor_id: user.id, // Override tutor_id to authenticated user
        }))
      );

      return NextResponse.json({
        success: true,
        exceptions,
        count: exceptions.length,
      });
    }

    // Check if importing UK bank holidays
    if (body.import_uk_holidays) {
      const year = body.year || new Date().getFullYear();
      const holidays = getUKBankHolidays(year, user.id);

      if (holidays.length === 0) {
        return NextResponse.json(
          { error: `No UK bank holidays available for year ${year}` },
          { status: 400 }
        );
      }

      const exceptions = await bulkCreateExceptions(holidays);

      return NextResponse.json({
        success: true,
        exceptions,
        count: exceptions.length,
        message: `Imported ${exceptions.length} UK bank holidays for ${year}`,
      });
    }

    // Single exception creation
    const {
      exception_type,
      start_date,
      end_date,
      title,
      blocks_all_day,
      time_ranges,
    } = body;

    // Validate required fields
    if (!exception_type || !start_date || !end_date || !title) {
      return NextResponse.json(
        {
          error: 'Missing required fields: exception_type, start_date, end_date, title',
        },
        { status: 400 }
      );
    }

    // Create exception
    const exception = await createException({
      tutor_id: user.id,
      exception_type: exception_type as ExceptionType,
      start_date,
      end_date,
      title,
      blocks_all_day: blocks_all_day ?? true,
      time_ranges,
    });

    return NextResponse.json({
      success: true,
      exception,
    });
  } catch (error) {
    console.error('[Availability Exceptions API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/availability/exceptions?id=<exception_id>
 * Deletes an availability exception
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get exception ID from query params
    const searchParams = request.nextUrl.searchParams;
    const exceptionId = searchParams.get('id');

    if (!exceptionId) {
      return NextResponse.json(
        { error: 'Exception ID is required' },
        { status: 400 }
      );
    }

    // 3. Verify ownership before deleting
    const { data: exception } = await supabase
      .from('tutor_availability_exceptions')
      .select('tutor_id')
      .eq('id', exceptionId)
      .single();

    if (!exception) {
      return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
    }

    if (exception.tutor_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own exceptions' },
        { status: 403 }
      );
    }

    // 4. Delete exception
    await deleteException(exceptionId);

    return NextResponse.json({
      success: true,
      message: 'Exception deleted successfully',
    });
  } catch (error) {
    console.error('[Availability Exceptions API] DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
