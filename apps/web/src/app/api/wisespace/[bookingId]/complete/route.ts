/**
 * Filename: route.ts
 * Purpose: Mark session as complete API endpoint for WiseSpace (v5.8)
 * Path: POST /api/wisespace/[bookingId]/complete
 * Created: 2025-11-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const supabase = await createClient();
    const bookingId = params.bookingId;

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch booking to validate access
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, tutor_id, student_id, status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 3. Validate user is participant (tutor or student)
    if (booking.tutor_id !== user.id && booking.student_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Update booking status to completed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'Completed', // Matching the booking_status_enum
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete session' },
        { status: 500 }
      );
    }

    // Note: CaaS recalculation happens automatically via database triggers (v6.1)
    // No manual queue insertion needed - trigger_caas_immediate_on_booking_complete fires on status update

    return NextResponse.json({
      success: true,
      message: 'Session marked as complete',
    });
  } catch (error) {
    console.error('Complete session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
