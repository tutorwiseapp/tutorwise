/**
 * Filename: apps/web/src/app/api/network/request/route.ts
 * Purpose: Send connection requests to one or more users (SDD v4.5)
 * Created: 2025-11-07
 * Updated: 2025-11-14 (v5.1) - Refactored to use ProfileGraphService
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { ProfileGraphService } from '@/lib/services/ProfileGraphService';
import { z } from 'zod';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  receiver_ids: z.array(z.string().uuid()).min(1).max(10),
  message: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    // Create connection requests using ProfileGraphService
    const data = await ProfileGraphService.createConnectionRequests({
      requesterId: user.id,
      receiverIds: receiver_ids,
      message,
    });

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
            const target = Array.isArray(connection.target)
              ? connection.target[0]
              : connection.target;

            if (target?.email) {
              await ProfileGraphService.sendConnectionRequestEmail({
                senderName: requesterProfile.full_name,
                senderEmail: requesterProfile.email,
                receiverEmail: target.email,
                message,
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

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('already connected') || error.message.includes('pending requests')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('yourself')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
