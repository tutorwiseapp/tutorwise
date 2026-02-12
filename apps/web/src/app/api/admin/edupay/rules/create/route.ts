/**
 * Filename: src/app/api/admin/edupay/rules/create/route.ts
 * Purpose: API endpoint for admin to create new EduPay earning rules
 * Created: 2026-02-12
 * Pattern: Follows admin API pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/edupay/rules/create
 * Create a new EduPay earning rule
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
      event_type,
      description,
      ep_per_unit,
      unit_type,
      platform_fee_percent,
      is_active,
      valid_from,
      valid_until,
    } = body;

    // Validation
    if (!event_type?.trim()) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      );
    }

    // Validate event_type format (lowercase with underscores)
    if (!/^[a-z][a-z0-9_]*$/.test(event_type.trim())) {
      return NextResponse.json(
        { error: 'Event type must be lowercase with underscores only' },
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

    // Check if rule with same event_type already exists
    const { data: existingRule } = await supabase
      .from('edupay_rules')
      .select('id')
      .eq('event_type', event_type.trim())
      .single();

    if (existingRule) {
      return NextResponse.json(
        { error: 'A rule with this event type already exists' },
        { status: 400 }
      );
    }

    // Create rule
    const { data: newRule, error: createError } = await supabase
      .from('edupay_rules')
      .insert({
        event_type: event_type.trim(),
        description: description?.trim() || null,
        ep_per_unit,
        unit_type: unit_type.trim(),
        platform_fee_percent,
        is_active: is_active ?? true,
        valid_from,
        valid_until: valid_until || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating rule:', createError);
      return NextResponse.json(
        { error: 'Failed to create rule' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: adminUser.id,
      action_type: 'edupay_rule_create',
      details: {
        rule_id: newRule.id,
        event_type: event_type.trim(),
        ep_per_unit,
        unit_type,
        platform_fee_percent,
        is_active,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Rule created successfully',
        rule: newRule,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create rule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
