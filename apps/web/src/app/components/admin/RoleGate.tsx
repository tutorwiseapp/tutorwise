/**
 * Filename: RoleGate.tsx
 * Purpose: Component to show/hide UI based on user role
 * Created: 2025-12-23
 *
 * Usage:
 * <RoleGate role="superadmin">
 *   <Button>Delete Everything</Button>
 * </RoleGate>
 *
 * <RoleGate roles={['superadmin', 'admin']}>
 *   <SEOManagementPanel />
 * </RoleGate>
 */

'use client';

import React from 'react';
import { useAdminProfile } from '@/lib/rbac';
import type { AdminRole } from '@/lib/rbac/types';

interface RoleGateProps {
  role?: AdminRole;
  roles?: AdminRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGate({ role, roles, children, fallback = null }: RoleGateProps) {
  const { profile, isLoading } = useAdminProfile();

  if (isLoading) {
    return null;
  }

  if (!profile?.is_admin || !profile?.admin_role) {
    return <>{fallback}</>;
  }

  const allowedRoles = role ? [role] : roles || [];
  const hasRole = allowedRoles.includes(profile.admin_role);

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
