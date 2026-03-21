/**
 * LiveKit Token API (v1.0)
 *
 * @path POST /api/virtualspace/[sessionId]/livekit-token
 * @description Generates a LiveKit access token for the requesting user.
 *              Returns 503 if LIVEKIT_* env vars are not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ sessionId: string }> }
) {
  const params = await props.params;
  const { sessionId } = params;

  // Check LiveKit is configured
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'LiveKit is not configured on this server', unconfigured: true },
      { status: 503 }
    );
  }

  const supabase = await createClient();

  // Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate session access
  const { data: session } = await supabase
    .from('virtualspace_sessions')
    .select('id, status, owner_id')
    .eq('id', sessionId)
    .single();

  if (!session || session.status === 'expired') {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  }

  // Fetch display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.full_name || user.email || user.id;
  const roomName = `tutorwise-${sessionId}`;

  // Generate token — 4 hour TTL (covers longest tutoring session)
  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: displayName,
    ttl: 4 * 60 * 60, // 4 hours in seconds
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const jwt = await token.toJwt();

  return NextResponse.json({ token: jwt, roomName });
}
