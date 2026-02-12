/**
 * Filename: src/app/api/admin/edupay/providers/toggle-active/route.ts
 * Purpose: API endpoint for toggling provider active status
 * Created: 2026-02-12
 * Pattern: Follows admin API pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/admin/edupay/providers/toggle-active
 * Toggle provider active/inactive status
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
    const { provider_id, is_active } = body;

    // Validation
    if (!provider_id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    // Check if provider exists
    const { data: existingProvider, error: fetchError } = await supabase
      .from('edupay_providers')
      .select('id, name, is_active')
      .eq('id', provider_id)
      .single();

    if (fetchError || !existingProvider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // If deactivating, check for active linked accounts
    if (!is_active) {
      const { count } = await supabase
        .from('edupay_linked_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', provider_id)
        .eq('is_active', true);

      if (count && count > 0) {
        return NextResponse.json(
          {
            error: `Cannot deactivate provider with ${count} active linked account(s). Users must unlink accounts first.`,
            linked_accounts_count: count,
          },
          { status: 400 }
        );
      }
    }

    // Update active status
    const { error: updateError } = await supabase
      .from('edupay_providers')
      .update({ is_active })
      .eq('id', provider_id);

    if (updateError) {
      console.error('Error updating provider status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update provider status' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase.from('admin_action_logs').insert({
      admin_id: adminUser.id,
      action_type: is_active ? 'edupay_provider_activate' : 'edupay_provider_deactivate',
      details: {
        provider_id,
        provider_name: existingProvider.name,
        previous_status: existingProvider.is_active,
        new_status: is_active,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Provider ${is_active ? 'activated' : 'deactivated'} successfully`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Toggle active error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
