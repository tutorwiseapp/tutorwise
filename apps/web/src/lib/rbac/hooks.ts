/**
 * Filename: src/lib/rbac/hooks.ts
 * Purpose: React hooks for RBAC permission checking
 * Created: 2025-12-23
 */

'use client';

import { useState, useEffect } from 'react';
import {
  hasPermission,
  getUserPermissions,
  canManageRole,
  getAdminProfile,
  isAdmin,
  isSuperadmin,
} from './permissions';
import type { AdminRole, AdminResource, AdminAction, AdminProfile } from './types';

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(resource: AdminResource, action: AdminAction) {
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkPermission() {
      setIsLoading(true);
      const access = await hasPermission(resource, action);
      if (isMounted) {
        setHasAccess(access);
        setIsLoading(false);
      }
    }

    checkPermission();

    return () => {
      isMounted = false;
    };
  }, [resource, action]);

  return { hasAccess, isLoading };
}

/**
 * Hook to get all user permissions
 */
export function useUserPermissions() {
  const [permissions, setPermissions] = useState<
    Array<{ resource: string; action: string; source: string }>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchPermissions() {
      setIsLoading(true);
      const perms = await getUserPermissions();
      if (isMounted) {
        setPermissions(perms);
        setIsLoading(false);
      }
    }

    fetchPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  return { permissions, isLoading };
}

/**
 * Hook to check if user can manage a specific admin role
 */
export function useCanManageRole(targetRole: AdminRole) {
  const [canManage, setCanManage] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkCanManage() {
      setIsLoading(true);
      const access = await canManageRole(targetRole);
      if (isMounted) {
        setCanManage(access);
        setIsLoading(false);
      }
    }

    checkCanManage();

    return () => {
      isMounted = false;
    };
  }, [targetRole]);

  return { canManage, isLoading };
}

/**
 * Hook to get current user's admin profile
 */
export function useAdminProfile() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      setIsLoading(true);
      const adminProfile = await getAdminProfile();
      if (isMounted) {
        setProfile(adminProfile);
        setIsLoading(false);
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return { profile, isLoading };
}

/**
 * Hook to check if user is admin (any role)
 */
export function useIsAdmin() {
  const [adminStatus, setAdminStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAdmin() {
      setIsLoading(true);
      const status = await isAdmin();
      if (isMounted) {
        setAdminStatus(status);
        setIsLoading(false);
      }
    }

    checkAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isAdmin: adminStatus, isLoading };
}

/**
 * Hook to check if user is superadmin
 */
export function useIsSuperadmin() {
  const [superadminStatus, setSuperadminStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSuperadmin() {
      setIsLoading(true);
      const status = await isSuperadmin();
      if (isMounted) {
        setSuperadminStatus(status);
        setIsLoading(false);
      }
    }

    checkSuperadmin();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isSuperadmin: superadminStatus, isLoading };
}
