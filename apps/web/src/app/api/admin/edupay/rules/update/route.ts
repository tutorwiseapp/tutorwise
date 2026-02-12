/**
 * Filename: src/app/api/admin/edupay/rules/update/route.ts
 * Purpose: API endpoint for admin to update EduPay earning rules
 * Created: 2026-02-12
 * Pattern: Follows admin API pattern from users/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/edupay/rules/update
 * Update an existing EduPay earning rule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', adminUser.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      id,
      description,
      ep_per_unit,
      unit_type,
      platform_fee_percent,
      is_active,
      valid_from,
      valid_until,
    } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    if (ep_per_unit < 1 || ep_per_unit > 10000) {
      return NextResponse.json(
        { error: 'EP per unit must be between 1 and 10,000' },
        { status: 400 }
      );
    }

    if (platform_fee_percent < 0 || platform_fee_percent > 100) {
      return NextResponse.json(
        { error: 'Platform fee must be between 0% and 100%' },
        { status: 400 }
      );
    }

    if (!unit_type?.trim()) {
      return NextResponse.json(
        { error: 'Unit type is required' },
        { status: 400 }
      );
    }

    if (!valid_from) {
      return NextResponse.json(
        { error: 'Valid from date is required' },
        { status: 400 }
      );
    }

    // Check if rule exists
    const { data: existingRule, error: fetchError } = await supabase
      .from('edupay_rules')
      .select('id, event_type')
      .eq('id', id)
      .single();

    if (fetchError || !existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Update rule
    const { error: updateError } = await supabase
      .from('edupay_rules')
      .update({
        description: description?.trim() || null,
        ep_per_unit,
        unit_type: unit_type.trim(),
        platform_fee_percent,
        is_active,
        valid_from,
        valid_until: valid_until || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating rule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update rule' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: adminUser.id,
      action_type: 'edupay_rule_update',
      details: {
        rule_id: id,
        event_type: existingRule.event_type,
        changes: {
          description,
          ep_per_unit,
          unit_type,
          platform_fee_percent,
          is_active,
          valid_from,
          valid_until,
        },
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Rule updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
