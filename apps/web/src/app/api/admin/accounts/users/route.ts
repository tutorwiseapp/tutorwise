/**
 * Filename: src/app/api/admin/accounts/users/route.ts
 * Purpose: API routes for admin user management (list all platform users)
 * Created: 2025-12-28
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/admin/accounts/users
 * List all platform users (tutors, clients, admins)
 * Supports pagination via query params: page, limit
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

    // Get pagination params from URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    // Fetch users with pagination
    // Show all users except admin-only users (those with is_admin=true AND no active_role)
    const { data: users, error, count} = await supabase
      .from('profiles')
      .select(
        `
        id,
        email,
        full_name,
        avatar_url,
        active_role,
        profile_completed,
        identity_verified,
        dbs_verified,
        proof_of_address_verified,
        is_admin,
        admin_role,
        created_at,
        updated_at
      `,
        { count: 'exact' }
      )
      .or('is_admin.is.null,is_admin.eq.false,active_role.in.(tutor,client,agent)')
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users, total: count || 0 }, { status: 200 });
  } catch (error) {
    console.error('Admin accounts/users GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
