/**
 * Filename: src/app/api/admin/edupay/providers/update-rate/route.ts
 * Purpose: API endpoint for updating provider interest rate
 * Created: 2026-02-12
 * Pattern: Follows admin API pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/edupay/providers/update-rate
 * Update provider interest rate
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
      .select('is_admin')
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
    const { provider_id, interest_rate_percent } = body;

    // Validation
    if (!provider_id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    if (typeof interest_rate_percent !== 'number' || interest_rate_percent < 0 || interest_rate_percent > 20) {
      return NextResponse.json(
        { error: 'Interest rate must be between 0% and 20%' },
        { status: 400 }
      );
    }

    // Check if provider exists
    const { data: existingProvider, error: fetchError } = await supabase
      .from('edupay_providers')
      .select('id, name, interest_rate_percent')
      .eq('id', provider_id)
      .single();

    if (fetchError || !existingProvider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const previousRate = existingProvider.interest_rate_percent;

    // Update interest rate
    const { error: updateError } = await supabase
      .from('edupay_providers')
      .update({ interest_rate_percent })
      .eq('id', provider_id);

    if (updateError) {
      console.error('Error updating provider rate:', updateError);
      return NextResponse.json(
        { error: 'Failed to update interest rate' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: adminUser.id,
      action_type: 'edupay_provider_rate_update',
      details: {
        provider_id,
        provider_name: existingProvider.name,
        previous_rate: previousRate,
        new_rate: interest_rate_percent,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Interest rate updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update rate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
