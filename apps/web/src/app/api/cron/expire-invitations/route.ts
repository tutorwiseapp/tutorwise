/**
 * Filename: apps/web/src/app/api/cron/expire-invitations/route.ts
 * Purpose: Expire old guardian invitations (cron job)
 * Created: 2026-02-08
 *
 * Called by pg_cron daily at 3am UTC
 * Marks pending invitations past their expiration date as 'expired'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/expire-invitations
 * Expires old guardian invitation tokens
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Expire Invitations] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    // Call the expiration function
    const { data, error } = await supabase.rpc('expire_old_guardian_invitations');

    if (error) {
      console.error('[Expire Invitations] Error calling function:', error);
      throw error;
    }

    const expiredCount = data || 0;

    console.log(`[Expire Invitations] Successfully expired ${expiredCount} invitation(s)`);

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Expire Invitations] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
