/**
 * Filename: apps/web/src/app/api/edupay/projection/route.ts
 * Purpose: GET loan impact projection for the authenticated user
 * Route: GET /api/edupay/projection
 * Created: 2026-02-10
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/edupay/projection
 * Calls the get_edupay_projection RPC which performs pure calculation:
 * - Monthly EP earning rate (avg last 3 months)
 * - Years earlier debt-free with EP contributions
 * - Total interest saved
 * - Projected completion date
 *
 * Returns null if user has not set up a loan profile.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: projection, error } = await supabase.rpc('get_edupay_projection', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('[EduPay Projection] RPC error:', error);
    return NextResponse.json({ error: 'Failed to calculate projection' }, { status: 500 });
  }

  // null if no loan profile set
  return NextResponse.json({ projection: projection ?? null });
}
