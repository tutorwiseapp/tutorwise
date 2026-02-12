/**
 * Filename: src/app/api/admin/edupay/conversions/mark-completed/route.ts
 * Purpose: API endpoint for admin to manually mark a conversion as completed
 * Created: 2026-02-12
 * Pattern: Follows admin API pattern with audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/edupay/conversions/mark-completed
 * Manually mark a conversion as completed
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
    const { conversion_id, reason, external_reference } = body;

    // Validation
    if (!conversion_id) {
      return NextResponse.json(
        { error: 'Conversion ID is required' },
        { status: 400 }
      );
    }

    if (!reason?.trim() || reason.trim().length < 20) {
      return NextResponse.json(
        { error: 'Completion reason must be at least 20 characters' },
        { status: 400 }
      );
    }

    // Fetch the conversion
    const { data: conversion, error: fetchError } = await supabase
      .from('edupay_conversions')
      .select('id, user_id, ep_amount, status')
      .eq('id', conversion_id)
      .single();

    if (fetchError || !conversion) {
      return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
    }

    // Check if conversion can be marked as completed
    if (conversion.status === 'completed') {
      return NextResponse.json(
        { error: 'Conversion is already completed' },
        { status: 400 }
      );
    }

    if (conversion.status === 'failed') {
      return NextResponse.json(
        { error: 'Cannot mark a failed conversion as completed. Use retry instead.' },
        { status: 400 }
      );
    }

    // Update conversion status
    const { error: updateError } = await supabase
      .from('edupay_conversions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        manual_completion_reason: reason.trim(),
        manual_completion_reference: external_reference?.trim() || null,
        manual_completion_by: adminUser.id,
      })
      .eq('id', conversion_id);

    if (updateError) {
      console.error('Error updating conversion:', updateError);
      return NextResponse.json(
        { error: 'Failed to update conversion' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: adminUser.id,
      action_type: 'edupay_conversion_manual_complete',
      target_user_id: conversion.user_id,
      details: {
        conversion_id,
        ep_amount: conversion.ep_amount,
        previous_status: conversion.status,
        reason: reason.trim(),
        external_reference: external_reference?.trim() || null,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Conversion marked as completed',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Mark completed error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
