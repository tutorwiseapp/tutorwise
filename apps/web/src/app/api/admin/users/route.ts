/**
 * Filename: src/app/api/admin/users/route.ts
 * Purpose: API routes for admin user management (list all admins)
 * Created: 2025-12-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/admin/users
 * List all admin users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all admin users
    const { data: adminUsers, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        email,
        full_name,
        is_admin,
        admin_role,
        admin_role_level,
        admin_granted_by,
        admin_granted_at,
        last_admin_access,
        created_at
      `
      )
      .eq('is_admin', true)
      .order('admin_role_level', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching admin users:', error);
      return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
    }

    return NextResponse.json({ adminUsers }, { status: 200 });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
