/**
 * Filename: route.ts
 * Purpose: Admin API to delete organisation subscription
 * Created: 2026-01-07
 *
 * DELETE /api/admin/organisations/[id]/subscription
 * Completely removes the organisation's subscription record (for cleanup/administrative purposes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { data: profile, error: profileError} = await supabase
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

    const organisationId = params.id;

    // Verify organisation exists
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('id, name')
      .eq('id', organisationId)
      .eq('type', 'organisation')
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      );
    }

    // Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('organisation_subscriptions')
      .select('id, status, stripe_subscription_id')
      .eq('organisation_id', organisationId)
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
      .from('organisation_subscriptions')
      .delete()
      .eq('organisation_id', organisationId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `Subscription deleted for organisation "${org.name}".${
        hasStripeSubscription
          ? ' Note: Stripe subscription still exists and should be canceled manually in Stripe dashboard.'
          : ''
      }`,
      warning: hasStripeSubscription ? 'Stripe subscription not canceled' : null,
    });

  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
