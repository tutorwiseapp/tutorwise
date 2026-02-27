/**
 * Filename: api/ai-agents/bundle-purchases/[purchaseId]/redeem/route.ts
 * Purpose: Redeem a session from a bundle purchase
 * Created: 2026-02-24
 * Phase: 3C - Bundle Pricing
 *
 * Atomically decrements session count from bundle when client starts a session.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RedeemSessionRequest {
  session_type: 'ai' | 'human';
  session_id?: string; // Optional: link to specific session
}

/**
 * POST /api/ai-agents/bundle-purchases/[purchaseId]/redeem
 * Redeem a session from bundle
 *
 * Body: {
 *   session_type: 'ai' | 'human',
 *   session_id?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  const supabase = await createClient();
  const { purchaseId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: RedeemSessionRequest = await request.json();
    const { session_type, session_id } = body;

    // 3. Validate session_type
    if (session_type !== 'ai' && session_type !== 'human') {
      return NextResponse.json(
        { error: 'session_type must be "ai" or "human"' },
        { status: 400 }
      );
    }

    // 4. Fetch bundle purchase to verify ownership
    const { data: purchase, error: fetchError } = await supabase
      .from('ai_tutor_bundle_purchases')
      .select('*, bundle:ai_tutor_bundles!bundle_id(bundle_name)')
      .eq('id', purchaseId)
      .single();

    if (fetchError || !purchase) {
      return NextResponse.json({ error: 'Bundle purchase not found' }, { status: 404 });
    }

    // 5. Verify client owns this purchase
    if (purchase.client_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this bundle purchase' },
        { status: 403 }
      );
    }

    // 6. Call database function to redeem session atomically
    const { data: result, error: redeemError } = await supabase
      .rpc('redeem_bundle_session', {
        p_purchase_id: purchaseId,
        p_session_type: session_type
      });

    if (redeemError) {
      console.error('[Redeem Session] RPC error:', redeemError);
      throw redeemError;
    }

    // 7. Check if redemption succeeded
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 8. If session_id provided, link it to bundle purchase
    if (session_id && session_type === 'ai') {
      await supabase
        .from('ai_tutor_sessions')
        .update({ bundle_purchase_id: purchaseId })
        .eq('id', session_id);
    }

    console.log('[Redeem Session] Session redeemed:', {
      purchaseId,
      sessionType: session_type,
      sessionsRemaining: result.sessions_remaining,
      clientId: user.id
    });

    return NextResponse.json({
      success: true,
      session_type: result.session_type,
      sessions_remaining: result.sessions_remaining,
      message: `${session_type === 'ai' ? 'AI' : 'Human'} session redeemed! ${result.sessions_remaining} sessions remaining.`
    });

  } catch (error) {
    console.error('[Redeem Session] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
