/**
 * Filename: src/app/api/admin/users/manage/route.ts
 * Purpose: API routes for granting/revoking admin access
 * Created: 2025-12-23
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { AdminRole } from '@/lib/rbac/types';

interface GrantAdminRequest {
  userEmail: string;
  role: AdminRole;
  reason?: string;
}

interface RevokeAdminRequest {
  userId: string;
  reason?: string;
}

interface ChangeRoleRequest {
  userId: string;
  newRole: AdminRole;
  reason?: string;
}

/**
 * POST /api/admin/users/manage
 * Grant admin access to a user
 */
export async function POST(request: NextRequest) {
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
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role, admin_role_level')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = (await request.json()) as GrantAdminRequest;
    const { userEmail, role, reason } = body;

    // Validate role
    const validRoles: AdminRole[] = ['superadmin', 'admin', 'systemadmin', 'supportadmin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if manager can grant this role
    const canGrant = await supabase.rpc('can_manage_admin', {
      p_manager_id: user.id,
      p_target_role: role,
    });

    if (canGrant.error || !canGrant.data) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot grant this role' },
        { status: 403 }
      );
    }

    // Find target user by email
    const { data: targetUser, error: findError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, admin_role')
      .eq('email', userEmail)
      .single();

    if (findError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has admin access
    if (targetUser.is_admin) {
      return NextResponse.json(
        { error: 'User already has admin access. Use PATCH to change role.' },
        { status: 400 }
      );
    }

    // Get role level
    const roleLevel = { superadmin: 4, admin: 3, systemadmin: 2, supportadmin: 1 }[role];

    // Grant admin access
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_admin: true,
        admin_role: role,
        admin_role_level: roleLevel,
        admin_granted_by: user.id,
        admin_granted_at: new Date().toISOString(),
      })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('Error granting admin access:', updateError);
      return NextResponse.json({ error: 'Failed to grant admin access' }, { status: 500 });
    }

    // Log to audit trail (trigger will handle this automatically, but we can add manual log too)
    await supabase.rpc('log_admin_action', {
      p_action: 'create',
      p_resource_type: 'admin_access',
      p_resource_id: targetUser.id,
      p_details: {
        role,
        user_email: userEmail,
        reason,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Admin access granted to ${userEmail} as ${role}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Grant admin POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/manage
 * Change admin user's role
 */
export async function PATCH(request: NextRequest) {
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
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = (await request.json()) as ChangeRoleRequest;
    const { userId, newRole, reason } = body;

    // Validate role
    const validRoles: AdminRole[] = ['superadmin', 'admin', 'systemadmin', 'supportadmin'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent changing own role
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Get target user
    const { data: targetUser, error: findError } = await supabase
      .from('profiles')
      .select('id, email, admin_role, admin_role_level')
      .eq('id', userId)
      .eq('is_admin', true)
      .single();

    if (findError || !targetUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    // Check if manager can change to this role
    const canChange = await supabase.rpc('can_manage_admin', {
      p_manager_id: user.id,
      p_target_role: newRole,
    });

    if (canChange.error || !canChange.data) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot grant this role' },
        { status: 403 }
      );
    }

    // Get new role level
    const newRoleLevel = { superadmin: 4, admin: 3, systemadmin: 2, supportadmin: 1 }[newRole];

    // Update role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        admin_role: newRole,
        admin_role_level: newRoleLevel,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error changing admin role:', updateError);
      return NextResponse.json({ error: 'Failed to change admin role' }, { status: 500 });
    }

    // Log to audit trail
    await supabase.rpc('log_admin_action', {
      p_action: 'update',
      p_resource_type: 'admin_role',
      p_resource_id: userId,
      p_details: {
        old_role: targetUser.admin_role,
        new_role: newRole,
        user_email: targetUser.email,
        reason,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Admin role changed to ${newRole}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Change role PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/manage
 * Revoke admin access from a user
 */
export async function DELETE(request: NextRequest) {
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
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = (await request.json()) as RevokeAdminRequest;
    const { userId, reason } = body;

    // Prevent revoking own access
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot revoke your own admin access' }, { status: 400 });
    }

    // Get target user
    const { data: targetUser, error: findError } = await supabase
      .from('profiles')
      .select('id, email, admin_role, admin_role_level')
      .eq('id', userId)
      .eq('is_admin', true)
      .single();

    if (findError || !targetUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    // Check if manager can revoke this user's access
    const canRevoke = await supabase.rpc('can_manage_admin', {
      p_manager_id: user.id,
      p_target_role: targetUser.admin_role,
    });

    if (canRevoke.error || !canRevoke.data) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot revoke this user\'s access' },
        { status: 403 }
      );
    }

    // Check if this is the last superadmin
    if (targetUser.admin_role === 'superadmin') {
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_admin', true)
        .eq('admin_role', 'superadmin');

      if (countError) {
        console.error('Error counting superadmins:', countError);
        return NextResponse.json({ error: 'Failed to verify superadmin count' }, { status: 500 });
      }

      if (count && count <= 1) {
        return NextResponse.json(
          { error: 'Cannot revoke the last superadmin' },
          { status: 400 }
        );
      }
    }

    // Revoke admin access
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_admin: false,
        admin_role: null,
        admin_role_level: null,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error revoking admin access:', updateError);
      return NextResponse.json({ error: 'Failed to revoke admin access' }, { status: 500 });
    }

    // Log to audit trail
    await supabase.rpc('log_admin_action', {
      p_action: 'delete',
      p_resource_type: 'admin_access',
      p_resource_id: userId,
      p_details: {
        old_role: targetUser.admin_role,
        user_email: targetUser.email,
        reason,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Admin access revoked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Revoke admin DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
