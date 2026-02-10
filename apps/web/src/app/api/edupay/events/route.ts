/**
 * Filename: apps/web/src/app/api/edupay/events/route.ts
 * Purpose: Internal endpoint to ingest EP-earning events (CaaS thresholds, referrals, affiliate)
 * Route: POST /api/edupay/events
 * Created: 2026-02-10
 *
 * Auth: Requires either:
 *   - Valid Supabase session (user awarding EP to themselves in tests)
 *   - Authorization: Bearer <INTERNAL_API_SECRET> header (server-to-server)
 *
 * Note: Tutoring income EP is awarded directly from the Stripe webhook via
 *       award_ep_for_payment RPC. This endpoint handles other event types.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/edupay/events
 * Ingests an EP-earning event and calls award_ep_for_event RPC.
 *
 * Body: {
 *   user_id: string         (required for server-to-server; omit to use authenticated user)
 *   event_type: string      (e.g. 'referral_income', 'caas_threshold', 'gift_reward')
 *   source_system: string   (e.g. 'tutorwise', 'awin', 'tillo', 'caas')
 *   value_gbp: number       (GBP value of the event)
 *   idempotency_key: string (unique key to prevent duplicate awards)
 *   metadata?: object       (optional event metadata)
 * }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth: check internal API secret or Supabase session
  const authHeader = req.headers.get('authorization');
  const internalSecret = process.env.INTERNAL_API_SECRET;

  let resolvedUserId: string | null = null;

  if (internalSecret && authHeader === `Bearer ${internalSecret}`) {
    // Server-to-server call — user_id must be in body
  } else {
    // Supabase session required
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    resolvedUserId = user.id;
  }

  let body: {
    user_id?: string;
    event_type?: string;
    source_system?: string;
    value_gbp?: number;
    idempotency_key?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    user_id,
    event_type,
    source_system,
    value_gbp,
    idempotency_key,
    metadata,
  } = body;

  // Resolve user_id
  const targetUserId = user_id ?? resolvedUserId;
  if (!targetUserId) {
    return NextResponse.json({ error: 'user_id is required for server-to-server calls' }, { status: 400 });
  }

  if (!event_type) {
    return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
  }

  if (value_gbp === undefined || value_gbp <= 0) {
    return NextResponse.json({ error: 'value_gbp must be a positive number' }, { status: 400 });
  }

  const { error } = await supabase.rpc('award_ep_for_event', {
    p_user_id: targetUserId,
    p_event_type: event_type,
    p_value_gbp: value_gbp,
    p_idempotency_key: idempotency_key ?? null,
    p_metadata: metadata ? JSON.stringify(metadata) : null,
    p_source_system: source_system ?? 'tutorwise',
  });

  if (error) {
    console.error('[EduPay Events] RPC error:', error);
    return NextResponse.json({ error: 'Failed to award EP' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
