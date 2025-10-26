/**
 * useRoleGuard Hook
 *
 * Protects pages by restricting access to specific roles.
 * Automatically redirects unauthorized users to a safe page.
 *
 * @example
 * ```tsx
 * // Protect a page for providers and agents only
 * function MyListingsPage() {
 *   const { isAllowed, isLoading } = useRoleGuard(['provider', 'agent']);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!isAllowed) return null; // Will redirect automatically
 *
 *   return <div>My Listings Content</div>;
 * }
 * ```
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '../contexts/UserProfileContext';

export type Role = 'seeker' | 'provider' | 'agent';

interface UseRoleGuardOptions {
  /** Roles allowed to access this page */
  allowedRoles: Role[];
  /** Where to redirect unauthorized users (default: '/dashboard') */
  redirectTo?: string;
  /** Whether to show console warnings for debugging (default: true in dev) */
  showWarnings?: boolean;
}

interface UseRoleGuardReturn {
  /** Whether the current user's role is allowed */
  isAllowed: boolean;
  /** Whether the profile is still loading */
  isLoading: boolean;
  /** The current active role */
  activeRole: Role | null;
}

/**
 * Hook to guard pages based on user role.
 *
 * @param options - Configuration options or array of allowed roles
 * @returns Object containing isAllowed, isLoading, and activeRole
 */
export function useRoleGuard(
  options: UseRoleGuardOptions | Role[]
): UseRoleGuardReturn {
  const { activeRole, isLoading } = useUserProfile();
  const router = useRouter();

  // Handle both array and object syntax
  const config: UseRoleGuardOptions = Array.isArray(options)
    ? { allowedRoles: options }
    : options;

  const {
    allowedRoles,
    redirectTo = '/dashboard',
    showWarnings = process.env.NODE_ENV === 'development'
  } = config;

  const isAllowed = activeRole ? allowedRoles.includes(activeRole) : false;

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Don't redirect if allowed
    if (isAllowed) return;

    // Log warning in development
    if (showWarnings && activeRole) {
      console.warn(
        `[useRoleGuard] Access denied: Role "${activeRole}" not in allowed roles [${allowedRoles.join(', ')}]. Redirecting to ${redirectTo}`
      );
    }

    // Redirect unauthorized users
    if (activeRole && !isAllowed) {
      router.push(redirectTo);
    }
  }, [isLoading, activeRole, isAllowed, allowedRoles, redirectTo, router, showWarnings]);

  return {
    isAllowed,
    isLoading,
    activeRole
  };
}

/**
 * Higher-order component to protect page components with role guards.
 *
 * @example
 * ```tsx
 * const MyListingsPage = withRoleGuard(
 *   ['provider', 'agent'],
 *   () => <div>My Listings Content</div>
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRoleGuard(
  allowedRoles: Role[],
  Component: any
): any {
  return function GuardedComponent(props: any) {
    const { isAllowed, isLoading } = useRoleGuard(allowedRoles);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAllowed) {
      return null; // Hook handles redirect
    }

    return <Component {...props} />;
  };
}
