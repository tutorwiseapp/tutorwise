/*
 * Filename: src/app/api/stripe/sage/cancel/route.ts
 * Purpose: Cancel Sage Pro subscription at period end
 * Created: 2026-02-22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cancelSubscription } from '@/lib/stripe/sage-pro-subscription';

/**
 * POST /api/stripe/sage/cancel
 * Cancel Sage Pro subscription at end of current billing period
 *
 * User keeps access until period ends, then reverts to free tier
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Cancel subscription
    await cancelSubscription(user.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription canceled. You will have access until the end of your billing period.',
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);

    // Handle specific error cases
    if (error instanceof Error && error.message === 'No active subscription found') {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
