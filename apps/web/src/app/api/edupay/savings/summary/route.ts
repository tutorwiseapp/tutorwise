/**
 * Filename: apps/web/src/app/api/edupay/savings/summary/route.ts
 * Purpose: GET user's savings summary with projected interest
 * Route: GET /api/edupay/savings/summary
 * Created: 2026-02-11
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/edupay/savings/summary
 * Returns aggregated savings data with projected interest
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use the database function for accurate calculations
  const { data, error } = await supabase
    .rpc('get_edupay_savings_summary', { p_user_id: user.id })
    .single();

  if (error) {
    console.error('[Savings Summary] Query error:', error);
    // Return empty summary on error
    return NextResponse.json({
      summary: {
        total_gbp_allocated: 0,
        total_projected_interest: 0,
        total_with_interest: 0,
        allocation_count: 0,
      },
    });
  }

  return NextResponse.json({ summary: data });
}
