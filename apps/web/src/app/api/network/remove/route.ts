/**
 * Filename: apps/web/src/app/api/network/remove/route.ts
 * Purpose: Remove a connection (v4.6 profile_graph)
 * Created: 2025-11-14
 * Pattern: Pattern 1 (User-Facing API) - API Solution Design v5.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ProfileGraphService } from '@/lib/services/ProfileGraphService';
import { checkRateLimit, rateLimitHeaders, rateLimitError } from '@/middleware/rateLimiting';
import { z } from 'zod';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

const RemoveSchema = z.object({
  connection_id: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (200 actions per day to prevent spam remove actions)
    const rateLimit = await checkRateLimit(user.id, 'network:action');
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
    const validation = RemoveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { connection_id } = validation.data;

    // Remove connection using ProfileGraphService
    await ProfileGraphService.removeConnection(connection_id, user.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Connection removed',
      },
      {
        headers: rateLimitHeaders(rateLimit.remaining - 1, rateLimit.resetAt)
      }
    );

  } catch (error) {
    console.error('[network/remove] Error:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
