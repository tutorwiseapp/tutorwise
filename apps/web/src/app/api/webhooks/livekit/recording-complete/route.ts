/**
 * LiveKit Recording Webhook (v1.0)
 *
 * POST /api/webhooks/livekit/recording-complete
 *
 * Receives LiveKit Egress webhook events. On EgressEnded, stores the
 * recording URL and duration against the session.
 *
 * LiveKit signs webhooks with the API secret — we verify the token header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { WebhookReceiver } from 'livekit-server-sdk';

export async function POST(request: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 });
  }

  const body = await request.text();
  const authHeader = request.headers.get('Authorization') || '';

  // Verify webhook signature
  const receiver = new WebhookReceiver(apiKey, apiSecret);
  let event: any;
  try {
    event = receiver.receive(body, authHeader);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  // Only handle EgressEnded events
  if (event.event !== 'egress_ended') {
    return NextResponse.json({ received: true });
  }

  const egressInfo = event.egressInfo;
  if (!egressInfo?.egressId) {
    return NextResponse.json({ received: true });
  }

  // Extract recording URL from file results
  const fileResult = egressInfo.fileResults?.[0];
  const recordingUrl = fileResult?.downloadUrl || fileResult?.location || null;
  const durationSecs = fileResult?.duration ? Math.round(Number(fileResult.duration) / 1e9) : null;

  const supabase = await createClient();

  // Find session by egress ID
  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('id')
    .eq('recording_egress_id', egressInfo.egressId)
    .single();

  if (!session) {
    console.warn('[livekit-webhook] No session found for egress', egressInfo.egressId);
    return NextResponse.json({ received: true });
  }

  // Store recording metadata
  await supabase
    .from('virtualspace_sessions')
    .update({
      recording_url: recordingUrl,
      recording_duration_secs: durationSecs,
      recording_completed_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  console.log(`[livekit-webhook] Recording saved for session ${session.id}:`, recordingUrl);
  return NextResponse.json({ received: true });
}
