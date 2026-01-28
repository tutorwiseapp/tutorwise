/**
 * Filename: route.ts
 * Purpose: Admin API to force activate organisation subscription (free access)
 * Created: 2026-01-07
 *
 * POST /api/admin/organisations/[id]/force-activate
 * Creates or updates subscription to 'active' status without requiring payment
 * Use cases: Partners, sponsors, internal teams, compensation, promotional offers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('organisation_subscriptions')
      .select('id, status')
      .eq('organisation_id', organisationId)
      .single();

    const now = new Date().toISOString();
    // Set billing period to 1 year from now (can be extended later)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    const futureDate = oneYearFromNow.toISOString();

    if (existingSubscription) {
      // Update existing subscription to active
      const { error: updateError } = await supabase
        .from('organisation_subscriptions')
        .update({
          status: 'active',
          current_period_start: now,
          current_period_end: futureDate,
          cancel_at_period_end: false,
          canceled_at: null,
          updated_at: now,
        })
        .eq('organisation_id', organisationId);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: `Subscription force-activated for organisation "${org.name}". Access granted until ${oneYearFromNow.toLocaleDateString('en-GB')}.`,
        action: 'updated',
      });
    } else {
      // Create new subscription record
      const { error: insertError } = await supabase
        .from('organisation_subscriptions')
        .insert({
          organisation_id: organisationId,
          status: 'active',
          stripe_subscription_id: null, // No Stripe subscription for manual activation
          stripe_customer_id: null,
          trial_start: null,
          trial_end: null,
          current_period_start: now,
          current_period_end: futureDate,
          cancel_at_period_end: false,
          canceled_at: null,
        });

      if (insertError) {
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: `Subscription force-activated for organisation "${org.name}". Access granted until ${oneYearFromNow.toLocaleDateString('en-GB')}.`,
        action: 'created',
      });
    }

  } catch (error) {
    console.error('Error force-activating subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
