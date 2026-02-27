/**
 * Filename: api/ai-agents/[id]/billing-portal/route.ts
 * Purpose: Create Stripe Billing Portal session for AI tutor subscription
 * Created: 2026-02-23
 * Version: v1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createBillingPortalSession } from '@/lib/ai-agents/subscription-manager';

/**
 * POST /api/ai-agents/[id]/billing-portal
 * Create Stripe Billing Portal session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await createBillingPortalSession(id, user.id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
