/*
 * Filename: src/app/api/sage/usage/route.ts
 * Purpose: Get Sage Pro usage statistics
 * Created: 2026-02-22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserUsageStats } from '@/lib/stripe/sage-pro-subscription';

/**
 * GET /api/sage/usage
 * Get user's Sage Pro usage statistics
 *
 * Returns:
 * - Subscription details
 * - Question quota (used, remaining, total)
 * - Storage quota (used, remaining, total in bytes)
 * - Tier information
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

    // Get usage stats
    const stats = await getUserUsageStats(user.id);

    // Determine tier
    const tier = stats.subscription &&
      (stats.subscription.status === 'trialing' || stats.subscription.status === 'active')
      ? 'pro'
      : 'free';

    return NextResponse.json({
      tier,
      subscription: stats.subscription,
      questions: {
        used: stats.questionQuota.used,
        remaining: stats.questionQuota.remaining,
        quota: stats.questionQuota.quota,
        allowed: stats.questionQuota.allowed,
        percentage: stats.questionQuota.quota > 0
          ? Math.round((stats.questionQuota.used / stats.questionQuota.quota) * 100)
          : 0,
      },
      storage: {
        usedBytes: stats.storageQuota.used,
        remainingBytes: stats.storageQuota.remaining,
        quotaBytes: stats.storageQuota.quota,
        allowed: stats.storageQuota.allowed,
        percentage: stats.storageQuota.quota > 0
          ? Math.round((stats.storageQuota.used / stats.storageQuota.quota) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}
