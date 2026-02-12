/**
 * Filename: src/app/api/admin/edupay/providers/route.ts
 * Purpose: API endpoint for listing EduPay providers
 * Created: 2026-02-12
 * Pattern: Follows admin API pattern
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/admin/edupay/providers
 * List all providers (admin only)
 */
export async function GET() {
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

    // Fetch all providers (including inactive for admin)
    const { data: providers, error } = await supabase
      .from('edupay_providers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching providers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      );
    }

    return NextResponse.json({ providers }, { status: 200 });
  } catch (error) {
    console.error('Providers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
