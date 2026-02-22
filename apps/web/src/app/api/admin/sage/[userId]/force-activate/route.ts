/**
 * Filename: route.ts
 * Purpose: Admin API to force activate Sage Pro subscription (free access)
 * Created: 2026-02-22
 *
 * POST /api/admin/sage/[userId]/force-activate
 * Creates or updates subscription to 'active' status without requiring payment
 * Use cases: Partners, sponsors, internal teams, compensation, promotional offers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const targetUserId = params.userId;

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('sage_pro_subscriptions')
      .select('id, status')
      .eq('user_id', targetUserId)
      .single();

    const now = new Date().toISOString();
    // Set billing period to 1 year from now (can be extended later)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const futureDate = oneYearFromNow.toISOString();

    if (existingSubscription) {
      // Update existing subscription to active
      const { error: updateError } = await supabase
        .from('sage_pro_subscriptions')
        .update({
          status: 'active',
          current_period_start: now,
          current_period_end: futureDate,
          cancel_at_period_end: false,
          canceled_at: null,
          updated_at: now,
        })
        .eq('user_id', targetUserId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: `Sage Pro subscription force-activated for "${targetUser.full_name || targetUser.email}". Access granted until ${oneYearFromNow.toLocaleDateString('en-GB')}.`,
        action: 'updated',
      });
    } else {
      // Create new subscription record with default quotas
      const { error: insertError } = await supabase
        .from('sage_pro_subscriptions')
        .insert({
          user_id: targetUserId,
          status: 'active',
          stripe_subscription_id: null, // No Stripe subscription for manual activation
          stripe_customer_id: null,
          trial_start: null,
          trial_end: null,
          current_period_start: now,
          current_period_end: futureDate,
          cancel_at_period_end: false,
          canceled_at: null,
          questions_used: 0,
          questions_quota: 5000, // Pro tier quota
          storage_used_bytes: 0,
          storage_quota_bytes: 5368709120, // 5 GB in bytes
        });

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: `Sage Pro subscription force-activated for "${targetUser.full_name || targetUser.email}". Access granted until ${oneYearFromNow.toLocaleDateString('en-GB')}.`,
        action: 'created',
      });
    }

  } catch (error) {
    console.error('Error force-activating Sage Pro subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
