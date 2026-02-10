/**
 * Filename: apps/web/src/app/api/edupay/conversion/request/route.ts
 * Purpose: POST EP → loan payment conversion request (Phase 3 placeholder)
 * Route: POST /api/edupay/conversion/request
 * Created: 2026-02-10
 *
 * Phase 3 Note: Full TrueLayer PISP integration deferred to Phase 3.
 * This endpoint validates auth and returns a friendly Phase 3 message.
 * The "Convert EP" button in the UI calls this endpoint.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/edupay/conversion/request
 * Phase 3 placeholder. Returns informational message.
 * Full TrueLayer PISP integration launches in Phase 3.
 */
export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'EP conversion launches in Phase 3. Your EP is accumulating — keep earning!',
    phase: 3,
    available: false,
  });
}
