/*
 * Filename: src/app/api/stripe/growth/cancel/route.ts
 * Purpose: Cancel Growth Pro subscription at period end
 * Created: 2026-03-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cancelGrowthSubscription } from '@/lib/stripe/growth-pro-subscription';

/**
 * POST /api/stripe/growth/cancel
 * Cancel Growth Pro subscription at end of current billing period
 *
 * User keeps access until period ends, then reverts to free tier
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await cancelGrowthSubscription(user.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription canceled. You will have access until the end of your billing period.',
    });
  } catch (error) {
    console.error('Error canceling Growth subscription:', error);

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
