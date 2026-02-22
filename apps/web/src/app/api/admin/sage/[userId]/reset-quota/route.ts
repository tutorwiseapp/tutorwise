/**
 * Filename: route.ts
 * Purpose: Admin API to reset Sage Pro usage quota
 * Created: 2026-02-22
 *
 * POST /api/admin/sage/[userId]/reset-quota
 * Resets questions_used and storage_used_bytes to 0 (for quota overruns, testing, or customer service)
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

    // Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('sage_pro_subscriptions')
      .select('id, questions_used, storage_used_bytes')
      .eq('user_id', targetUserId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Reset usage to 0
    const { error: updateError } = await supabase
      .from('sage_pro_subscriptions')
      .update({
        questions_used: 0,
        storage_used_bytes: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUserId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Usage quota reset for "${targetUser.full_name || targetUser.email}". Questions and storage usage set to 0.`,
      previous: {
        questions_used: subscription.questions_used,
        storage_used_bytes: subscription.storage_used_bytes,
      },
    });

  } catch (error) {
    console.error('Error resetting Sage Pro quota:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
