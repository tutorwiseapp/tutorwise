/**
 * Filename: route.ts
 * Purpose: Admin API to reset organisation trial period
 * Created: 2026-01-07
 *
 * DELETE /api/admin/organisations/[id]/reset-trial
 * Deletes the organisation's subscription record, allowing them to start a fresh 14-day trial
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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

    // Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('organisation_subscriptions')
      .select('id, status')
      .eq('organisation_id', organisationId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found to reset' },
        { status: 404 }
      );
    }

    // Prevent resetting active or trialing subscriptions (safety check)
    if (['active', 'trialing'].includes(subscription.status)) {
      return NextResponse.json(
        { error: 'Cannot reset an active or ongoing trial subscription' },
        { status: 400 }
      );
    }

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
      message: `Trial period reset for organisation "${org.name}". They can now start a fresh 14-day trial.`,
    });

  } catch (error) {
    console.error('Error resetting trial:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
