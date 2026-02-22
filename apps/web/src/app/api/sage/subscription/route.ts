/*
 * Filename: src/app/api/sage/subscription/route.ts
 * Purpose: Get Sage Pro subscription status
 * Created: 2026-02-22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSageProSubscription } from '@/lib/stripe/sage-pro-subscription';

/**
 * GET /api/sage/subscription
 * Get user's Sage Pro subscription details
 *
 * Returns:
 * - Subscription status
 * - Trial information
 * - Billing cycle dates
 * - Cancellation status
 * - null if no subscription (free tier)
 */
export async function GET(request: NextRequest) {
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

    // Get subscription
    const subscription = await getSageProSubscription(user.id);

    // Return subscription or null for free tier
    return NextResponse.json({
      subscription: subscription || null,
      tier: subscription && (subscription.status === 'trialing' || subscription.status === 'active')
        ? 'pro'
        : 'free',
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
