/**
 * Filename: route.ts
 * Purpose: Save whiteboard snapshot API endpoint for WiseSpace (v5.8)
 * Path: POST /api/wisespace/[bookingId]/snapshot
 * Created: 2025-11-15
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest, props: { params: Promise<{ bookingId: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const bookingId = params.bookingId;

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { snapshotData } = body;

    if (!snapshotData || typeof snapshotData !== 'string') {
      return NextResponse.json(
        { error: 'Invalid snapshot data' },
        { status: 400 }
      );
    }

    // 3. Fetch booking to validate access
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, tutor_id, student_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 4. Validate user is participant
    if (booking.tutor_id !== user.id && booking.student_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 5. Upload snapshot to Supabase Storage
    const fileName = `${bookingId}-${Date.now()}.json`;
    const { data: _uploadData, error: uploadError } = await supabase.storage
      .from('booking-artifacts')
      .upload(fileName, snapshotData, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload snapshot' },
        { status: 500 }
      );
    }

    // 6. Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('booking-artifacts')
      .getPublicUrl(fileName);

    // 7. Update booking with snapshot URL in session_artifacts
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        session_artifacts: {
          whiteboard_snapshot_url: publicUrl,
          saved_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking artifacts:', updateError);
      return NextResponse.json(
        { error: 'Failed to save snapshot metadata' },
        { status: 500 }
      );
    }

    // Note: CaaS recalculation happens automatically via database triggers (v6.1)
    // Recording URLs trigger via trigger_caas_immediate_on_recording_url_added if recording_url column exists

    return NextResponse.json({
      success: true,
      snapshotUrl: publicUrl,
      message: 'Snapshot saved successfully',
    });
  } catch (error) {
    console.error('Save snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
