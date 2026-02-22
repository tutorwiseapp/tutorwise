/**
 * Filename: route.ts
 * Purpose: Admin API to delete Sage Pro subscription
 * Created: 2026-02-22
 *
 * DELETE /api/admin/sage/[userId]/subscription
 * Completely removes the user's Sage Pro subscription record (for cleanup/administrative purposes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
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

    // Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('sage_pro_subscriptions')
      .select('id, status, stripe_subscription_id')
      .eq('user_id', targetUserId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Warning: This will delete the subscription record
    // If there's a Stripe subscription, it should be canceled in Stripe separately
    const hasStripeSubscription = !!subscription.stripe_subscription_id;

    // Delete the subscription record
    const { error: deleteError } = await supabase
      .from('sage_pro_subscriptions')
      .delete()
      .eq('user_id', targetUserId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `Sage Pro subscription deleted for "${targetUser.full_name || targetUser.email}".${
        hasStripeSubscription
          ? ' Note: Stripe subscription still exists and should be canceled manually in Stripe dashboard.'
          : ''
      }`,
      warning: hasStripeSubscription ? 'Stripe subscription not canceled' : null,
    });

  } catch (error) {
    console.error('Error deleting Sage Pro subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
