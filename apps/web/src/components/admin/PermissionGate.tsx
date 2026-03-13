/**
 * Filename: PermissionGate.tsx
 * Purpose: Component to show/hide UI based on user permissions
 * Created: 2025-12-23
 *
 * Usage:
 * <PermissionGate resource="seo" action="create">
 *   <Button>Create Hub</Button>
 * </PermissionGate>
 *
 * <PermissionGate resource="users" action="view" fallback={<p>No access</p>}>
 *   <UsersList />
 * </PermissionGate>
 */

'use client';

import React from 'react';
import { usePermission } from '@/lib/rbac';
import type { AdminResource, AdminAction } from '@/lib/rbac/types';

interface PermissionGateProps {
  resource: AdminResource;
  action: AdminAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

export default function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
  showLoading = false,
}: PermissionGateProps) {
  const { hasAccess, isLoading } = usePermission(resource, action);

  if (isLoading && showLoading) {
    return <div className="permission-gate-loading">Loading permissions...</div>;
  }

  if (isLoading && !showLoading) {
    return null;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
