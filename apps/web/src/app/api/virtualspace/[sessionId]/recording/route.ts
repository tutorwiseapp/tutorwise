/**
 * Recording API (v1.0)
 *
 * POST /api/virtualspace/[sessionId]/recording — start LiveKit Egress recording
 * DELETE /api/virtualspace/[sessionId]/recording — stop recording
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EgressClient } from 'livekit-server-sdk';

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '';
  const s3Bucket = process.env.LIVEKIT_RECORDING_BUCKET;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json({ error: 'LiveKit not configured', unconfigured: true }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only the session owner / tutor can start recording
  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('id, owner_id, status, booking_id')
    .eq('id', sessionId)
    .single();

  if (!session || session.status === 'expired') {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  }

  // Allow owner or booking tutor
  let allowed = session.owner_id === user.id;
  if (!allowed && session.booking_id) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('tutor_id')
      .eq('id', session.booking_id)
      .single();
    if (booking?.tutor_id === user.id) allowed = true;
  }
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret);
    const roomName = `tutorwise-${sessionId}`;

    // Use S3 output if bucket configured, otherwise fallback to URL output placeholder
    const output = s3Bucket
      ? {
          s3: {
            bucket: s3Bucket,
            key: `recordings/${sessionId}/{time}.mp4`,
            region: process.env.LIVEKIT_RECORDING_S3_REGION || 'us-east-1',
            accessKey: process.env.LIVEKIT_RECORDING_S3_KEY || '',
            secret: process.env.LIVEKIT_RECORDING_S3_SECRET || '',
          },
        }
      : undefined;

    // Start room composite egress (full room recording)
    const egress = await egressClient.startRoomCompositeEgress(roomName, { file: output as any });

    // Store egress ID so we can stop it later + receive the webhook
    await supabase
      .from('virtualspace_sessions')
      .update({
        recording_egress_id: egress.egressId,
        recording_started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    return NextResponse.json({ success: true, egressId: egress.egressId });
  } catch (err: any) {
    console.error('[recording/start] LiveKit Egress error:', err);
    return NextResponse.json({ error: err.message || 'Failed to start recording' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await props.params;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('owner_id, recording_egress_id')
    .eq('id', sessionId)
    .single();

  if (!session?.recording_egress_id) {
    return NextResponse.json({ error: 'No active recording' }, { status: 400 });
  }
  if (session.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const egressClient = new EgressClient(livekitUrl, apiKey, apiSecret);
    await egressClient.stopEgress(session.recording_egress_id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[recording/stop] LiveKit Egress error:', err);
    return NextResponse.json({ error: err.message || 'Failed to stop recording' }, { status: 500 });
  }
}
