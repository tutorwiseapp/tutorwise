/**
 * Filename: apps/web/src/app/api/links/client-student/[id]/route.ts
 * Purpose: Remove Guardian Link (unlink student) (SDD v5.0)
 * Created: 2025-11-12
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { logGuardianLinkRemoved } from '@/lib/audit/logger';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/links/client-student/[id]
 * Remove a Guardian Link (unlink a student from the guardian)
 */
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (100 actions per day to prevent spam)
    const rateLimit = await checkRateLimit(user.id, 'student:action');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt)
        }
      );
    }

    const linkId = params.id;

    // Verify the link exists and belongs to the current user
    const { data: link, error: fetchError } = await supabase
      .from('profile_graph')
      .select('id, source_profile_id, target_profile_id, relationship_type')
      .eq('id', linkId)
      .eq('source_profile_id', user.id)
      .eq('relationship_type', 'GUARDIAN')
      .maybeSingle();

    if (fetchError) {
      console.error('[client-student/delete] Error fetching link:', fetchError);
      throw fetchError;
    }

    if (!link) {
      return NextResponse.json(
        { error: 'Guardian link not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check for active bookings before allowing unlink (Fix #2: Prevent orphaned data)
    const { data: activeBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, start_time')
      .eq('client_id', user.id)
      .eq('student_id', link.target_profile_id)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .order('start_time', { ascending: true });

    if (bookingsError) {
      console.error('[client-student/delete] Error checking bookings:', bookingsError);
      throw bookingsError;
    }

    if (activeBookings && activeBookings.length > 0) {
      const upcomingCount = activeBookings.filter(b =>
        new Date(b.start_time) > new Date()
      ).length;

      return NextResponse.json(
        {
          error: `Cannot unlink student with ${activeBookings.length} active booking(s)`,
          details: {
            active_bookings: activeBookings.length,
            upcoming_bookings: upcomingCount,
            message: 'Please cancel or complete all bookings before unlinking student',
            booking_ids: activeBookings.map(b => b.id)
          }
        },
        { status: 400 }
      );
    }

    // Safe to delete - no active bookings
    const { error: deleteError } = await supabase
      .from('profile_graph')
      .delete()
      .eq('id', linkId)
      .eq('relationship_type', 'GUARDIAN');

    if (deleteError) {
      console.error('[client-student/delete] Error deleting link:', deleteError);
      throw deleteError;
    }

    // Log guardian link removal
    await logGuardianLinkRemoved(
      user.id,
      link.target_profile_id,
      linkId,
      true, // activeBookingsChecked - we checked above
      request
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Student unlinked successfully',
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('[client-student/delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
