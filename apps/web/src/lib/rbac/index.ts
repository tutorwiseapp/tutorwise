/**
 * Filename: src/lib/rbac/index.ts
 * Purpose: RBAC module exports
 * Created: 2025-12-23
 */

// Types
export type {
  AdminRole,
  AdminResource,
  AdminAction,
  AdminPermission,
  AdminUserPermissionOverride,
  AdminProfile,
} from './types';

export { ROLE_HIERARCHY } from './types';

// Permission functions
export {
  hasPermission,
  hasPermissionServer,
  getUserPermissions,
  canManageRole,
  getAdminProfile,
  isAdmin,
  isSuperadmin,
  getRoleLevel,
  canRoleManageRole,
} from './permissions';

// React hooks
export {
  usePermission,
  useUserPermissions,
  useCanManageRole,
  useAdminProfile,
  useIsAdmin,
  useIsSuperadmin,
} from './hooks';
