/**
 * Filename: apps/web/src/app/api/network/request/route.ts
 * Purpose: Send connection requests to one or more users (SDD v4.5)
 * Created: 2025-11-07
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { sendConnectionRequestNotification } from '@/lib/email';
import { z } from 'zod';

const RequestSchema = z.object({
  receiver_ids: z.array(z.string().uuid()).min(1).max(10),
  message: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (100 requests per day)
    const rateLimit = await checkRateLimit(user.id, 'network:request');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimit),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimit.remaining, rateLimit.resetAt)
        }
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { receiver_ids, message } = validation.data;

    // Check if users exist and are not already connected
    const { data: existingConnections } = await supabase
      .from('connections')
      .select('receiver_id, status')
      .eq('requester_id', user.id)
      .in('receiver_id', receiver_ids);

    const existingMap = new Map(
      existingConnections?.map(c => [c.receiver_id, c.status]) || []
    );

    // Filter out users who are already connected or have pending requests
    const newReceivers = receiver_ids.filter(id => !existingMap.has(id));

    if (newReceivers.length === 0) {
      return NextResponse.json(
        { error: 'All users are already connected or have pending requests' },
        { status: 400 }
      );
    }

    // Check for self-connection attempts
    if (newReceivers.includes(user.id)) {
      return NextResponse.json(
        { error: 'Cannot send connection request to yourself' },
        { status: 400 }
      );
    }

    // Verify receiver profiles exist
    const { data: receiverProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .in('id', newReceivers);

    if (profileError || !receiverProfiles || receiverProfiles.length !== newReceivers.length) {
      return NextResponse.json(
        { error: 'One or more users not found' },
        { status: 404 }
      );
    }

    // Create connection requests
    const connections = newReceivers.map(receiver_id => ({
      requester_id: user.id,
      receiver_id,
      status: 'pending',
      message: message || null,
    }));

    const { data, error } = await supabase
      .from('connections')
      .insert(connections)
      .select(`
        id,
        receiver_id,
        status,
        created_at,
        receiver:receiver_id(id, full_name, email, avatar_url)
      `);

    if (error) {
      console.error('[network/request] Database error:', error);
      throw error;
    }

    // Get requester profile for email notifications
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    // Send email notifications to receivers (non-blocking)
    if (requesterProfile && data.length > 0) {
      const networkUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/network`;

      Promise.all(
        data.map(async (connection: any) => {
          try {
            const receiver = Array.isArray(connection.receiver)
              ? connection.receiver[0]
              : connection.receiver;

            if (receiver?.email) {
              await sendConnectionRequestNotification({
                to: receiver.email,
                senderName: requesterProfile.full_name,
                senderEmail: requesterProfile.email,
                message: message,
                networkUrl,
              });
            }
          } catch (emailError) {
            console.error('[network/request] Email error:', emailError);
            // Non-blocking error
          }
        })
      ).catch(err => console.error('[network/request] Email batch error:', err));
    }

    // Analytics events are automatically logged via trigger (041 migration)

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        connections: data,
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('[network/request] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
