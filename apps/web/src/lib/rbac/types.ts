/**
 * Filename: src/lib/rbac/types.ts
 * Purpose: TypeScript types for RBAC system
 * Created: 2025-12-23
 */

export type AdminRole = 'superadmin' | 'admin' | 'systemadmin' | 'supportadmin';

export type AdminResource =
  | 'seo'
  | 'users'
  | 'listings'
  | 'bookings'
  | 'ai_tutors'
  | 'reviews'
  | 'referrals'
  | 'organisations'
  | 'financials'
  | 'disputes'
  | 'reports'
  | 'settings'
  | 'integrations'
  | 'audit_logs'
  | 'messages'
  | 'admins'
  | '*'; // Wildcard for superadmin

export type AdminAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'moderate'
  | 'approve'
  | 'manage'
  | 'publish'
  | 'suspend'
  | 'manage_lower' // Can manage lower-level admins
  | '*'; // Wildcard for superadmin

export interface AdminPermission {
  id: string;
  role: AdminRole;
  resource: AdminResource;
  action: AdminAction;
  description?: string;
}

export interface AdminUserPermissionOverride {
  id: string;
  user_id: string;
  resource: AdminResource;
  action: AdminAction;
  granted: boolean; // true = grant, false = revoke
  granted_by: string;
  reason?: string;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name?: string;
  is_admin: boolean;
  admin_role?: AdminRole;
  admin_role_level?: number;
  admin_granted_by?: string;
  admin_granted_at?: string;
  last_admin_access?: string;
}

export const ROLE_HIERARCHY: Record<AdminRole, {
  level: number;
  description: string;
  canManage: AdminRole[];
}> = {
  superadmin: {
    level: 4,
    description: 'Full platform control',
    canManage: ['superadmin', 'admin', 'systemadmin', 'supportadmin'],
  },
  admin: {
    level: 3,
    description: 'SEO & content management',
    canManage: ['admin', 'systemadmin', 'supportadmin'],
  },
  systemadmin: {
    level: 2,
    description: 'Platform configuration & monitoring',
    canManage: ['systemadmin', 'supportadmin'],
  },
  supportadmin: {
    level: 1,
    description: 'User support & moderation',
    canManage: ['supportadmin'],
  },
};
