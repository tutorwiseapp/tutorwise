/**
 * Filename: src/lib/rbac.ts
 * Purpose: Role-Based Access Control hooks
 * Created: 2025-12-29
 *
 * Provides hooks for checking user permissions in admin pages
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Hook to check if user has permission for a resource action
 * For now, returns true if user is any type of admin
 * Can be extended later with granular permissions
 */
export function usePermission(resource: string, action: string): boolean {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setHasPermission(false);
          setIsLoading(false);
          return;
        }

        // Check if user is an admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('admin_role')
          .eq('id', user.id)
          .single();

        // If user has any admin role, they have permission
        // TODO: Implement granular permissions based on resource and action
        setHasPermission(!!profile?.admin_role);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkPermission();
  }, [resource, action]);

  return hasPermission;
}

/**
 * Hook to check if user is an admin
 */
export function useIsAdmin(): boolean {
  return usePermission('admin', 'access');
}

/**
 * Hook to get user's admin role
 */
export function useAdminRole(): string | null {
  const [adminRole, setAdminRole] = useState<string | null>(null);

  useEffect(() => {
    async function getAdminRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setAdminRole(null);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('admin_role')
          .eq('id', user.id)
          .single();

        setAdminRole(profile?.admin_role || null);
      } catch (error) {
        console.error('Error getting admin role:', error);
        setAdminRole(null);
      }
    }

    getAdminRole();
  }, []);

  return adminRole;
}

/**
 * Hook to get user's full admin profile
 */
export function useAdminProfile(): { profile: { id: string; admin_role: string } | null; isLoading: boolean } {
  const [profile, setProfile] = useState<{ id: string; admin_role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('id, admin_role')
          .eq('id', user.id)
          .single();

        setProfile(data || null);
      } catch (error) {
        console.error('Error getting admin profile:', error);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    }

    getProfile();
  }, []);

  return { profile, isLoading };
}
