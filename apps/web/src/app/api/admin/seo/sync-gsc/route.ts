/**
 * Filename: src/app/api/admin/seo/sync-gsc/route.ts
 * Purpose: API endpoint to manually trigger GSC sync
 * Created: 2025-12-29
 *
 * Allows admins to manually sync Google Search Console data
 * Respects toggle settings in seo_settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { syncGSCPerformance } from '@/services/seo/gsc-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse request body for optional days parameter
    const body = await request.json().catch(() => ({}));
    const days = body.days || 30;

    // Trigger GSC sync (respects toggle settings)
    const result = await syncGSCPerformance(days);

    return NextResponse.json({
      success: true,
      ...result,
      message: result.skipped
        ? `GSC sync skipped: ${result.reason}`
        : `Successfully synced ${result.synced} rows from GSC`,
    });
  } catch (error) {
    console.error('GSC sync API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
