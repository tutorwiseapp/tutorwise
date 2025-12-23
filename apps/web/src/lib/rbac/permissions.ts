/**
 * Filename: src/lib/rbac/permissions.ts
 * Purpose: RBAC permission checking utilities (client + server)
 * Created: 2025-12-23
 */

import { createClient as createBrowserClient } from '@/utils/supabase/client';
import type { AdminRole, AdminResource, AdminAction, AdminProfile } from './types';
import { ROLE_HIERARCHY } from './types';

/**
 * Check if user has a specific permission (client-side)
 */
export async function hasPermission(
  resource: AdminResource,
  action: AdminAction
): Promise<boolean> {
  const supabase = createBrowserClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Call database function to check permission
    const { data, error } = await supabase.rpc('has_admin_permission', {
      p_user_id: user.id,
      p_resource: resource,
      p_action: action,
    });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Get all permissions for current user
 */
export async function getUserPermissions(): Promise<
  Array<{ resource: string; action: string; source: string }>
> {
  const supabase = createBrowserClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase.rpc('get_user_admin_permissions', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Get permissions error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get permissions failed:', error);
    return [];
  }
}

/**
 * Check if current user can manage a specific admin role
 */
export async function canManageRole(targetRole: AdminRole): Promise<boolean> {
  const supabase = createBrowserClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase.rpc('can_manage_admin', {
      p_manager_id: user.id,
      p_target_role: targetRole,
    });

    if (error) {
      console.error('Can manage role check error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Can manage role check failed:', error);
    return false;
  }
}

/**
 * Get current user's admin profile
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const supabase = createBrowserClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, is_admin, admin_role, admin_role_level, admin_granted_by, admin_granted_at, last_admin_access'
      )
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Get admin profile error:', error);
      return null;
    }

    return data as AdminProfile;
  } catch (error) {
    console.error('Get admin profile failed:', error);
    return null;
  }
}

/**
 * Check if user is admin (any role)
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getAdminProfile();
  return profile?.is_admin === true;
}

/**
 * Check if user is superadmin
 */
export async function isSuperadmin(): Promise<boolean> {
  const profile = await getAdminProfile();
  return profile?.admin_role === 'superadmin';
}

/**
 * Get role hierarchy level
 */
export function getRoleLevel(role: AdminRole): number {
  return ROLE_HIERARCHY[role]?.level || 0;
}

/**
 * Check if manager role can manage target role
 */
export function canRoleManageRole(
  managerRole: AdminRole,
  targetRole: AdminRole
): boolean {
  const managerLevel = getRoleLevel(managerRole);
  const targetLevel = getRoleLevel(targetRole);

  // Superadmins can manage anyone (including other superadmins)
  if (managerRole === 'superadmin') return true;

  // Otherwise, can only manage lower-level roles
  return managerLevel > targetLevel;
}
