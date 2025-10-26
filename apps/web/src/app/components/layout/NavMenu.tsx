/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the main site navigation header, migrated to Supabase Auth.
 * Change History:
 * C003 - 2025-09-02 : 17:00 - Migrated from Kinde to Supabase with UserProfileContext.
 * C002 - 2025-08-26 : 10:00 - Replaced Clerk components and hooks with Kinde.
 * Last Modified: 2025-09-02 : 17:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This component is now fully migrated to Supabase Auth. It uses our custom `useUserProfile` hook to get the user's session and profile data. The logout button now calls the Supabase `signOut` method.
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import GuanMenuIcon from '../ui/nav/GuanMenuIcon';
import styles from './NavMenu.module.css';
import getProfileImageUrl from '@/lib/utils/image';

type Role = 'agent' | 'provider' | 'seeker';

interface RoleConfig {
  label: string;
  icon: string;
}

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, isLoading, activeRole, availableRoles, switchRole, isRoleSwitching } = useUserProfile();
  const router = useRouter();

  // Role configuration matching your design
  const roleConfig: Record<Role, RoleConfig> = {
    agent: { label: 'Agent', icon: '🏠' },
    provider: { label: 'Tutor', icon: '🎓' },
    seeker: { label: 'Client', icon: '📚' }
  } as const;

  const handleRoleSwitch = async (role: Role) => {
    try {
      await switchRole(role);
      setIsOpen(false);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      // 1. Let Supabase handle the global sign out.
      // This clears its own cookies and localStorage items correctly.
      await supabase.auth.signOut({ scope: 'global' });

      // 2. Force a hard refresh to the homepage to clear all client-side state.
      window.location.href = '/';

    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: still force the redirect if the sign out fails for any reason.
      window.location.href = '/';
    }
  };

  if (isLoading) {
    return <div style={{ width: '80px' }} />; // Placeholder to prevent layout shift
  }

  const isAuthenticated = !!profile;

  return (
    <nav>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            className={isAuthenticated ? styles.loggedInTrigger : styles.loggedOutTrigger}
            aria-label="Open user menu"
          >
            {isAuthenticated ? (
              <>
                <Image
                  src={getProfileImageUrl(profile)}
                  alt="User Avatar"
                  width={40}
                  height={40}
                  className={styles.avatar}
                />
                <GuanMenuIcon isOpen={isOpen} />
              </>
            ) : (
              <GuanMenuIcon isOpen={isOpen} />
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.menuContent} sideOffset={10} align="end">
            {isAuthenticated ? (
              <>
                {/* Role Header - Only show if onboarding is complete */}
                <DropdownMenu.Label className={styles.roleLabel}>
                  {activeRole && roleConfig[activeRole] && profile?.onboarding_progress?.onboarding_completed ?
                    `${roleConfig[activeRole].icon} ${roleConfig[activeRole].label}` :
                    'Member'
                  }
                </DropdownMenu.Label>
                <div className={styles.separator} />

                {/* Main Navigation Items */}
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/messages">Messages</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/my-network">My network</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/my-listings">My listings</Link>
                </DropdownMenu.Item>

                <div className={styles.separator12px} />

                {/* Role Switching Section - Show if user has multiple roles */}
                {availableRoles && availableRoles.length > 1 && (
                  <>
                    <DropdownMenu.Label className={styles.switchLabel}>
                      Switch Role:
                    </DropdownMenu.Label>

                    {/* Other Available Roles (excluding current active role) */}
                    {availableRoles.map((role) => {
                      if (role === activeRole) return null;
                      const config = roleConfig[role];
                      return (
                        <DropdownMenu.Item
                          key={role}
                          className={styles.roleItem}
                          onSelect={() => handleRoleSwitch(role)}
                          disabled={isRoleSwitching}
                        >
                          {config.icon} {config.label}
                        </DropdownMenu.Item>
                      );
                    })}
                  </>
                )}

                {/* Role Onboarding Section - Only show roles user doesn't have */}
                {!availableRoles?.includes('provider') && (
                  <DropdownMenu.Item asChild className={styles.becomeItem}>
                    <Link href="/onboarding">
                      <div className={styles.becomeContent}>
                        <div>
                          <div className={styles.becomeTitle}>Become a tutor</div>
                          <div className={styles.becomeSubtitle}>Start teaching and earn income</div>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenu.Item>
                )}
                {!availableRoles?.includes('seeker') && (
                  <DropdownMenu.Item asChild className={styles.becomeItem}>
                    <Link href="/onboarding">
                      <div className={styles.becomeContent}>
                        <div>
                          <div className={styles.becomeTitle}>Become a client</div>
                          <div className={styles.becomeSubtitle}>Find tutors and start learning</div>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenu.Item>
                )}
                {!availableRoles?.includes('agent') && (
                  <DropdownMenu.Item asChild className={styles.becomeItem}>
                    <Link href="/onboarding">
                      <div className={styles.becomeContent}>
                        <div>
                          <div className={styles.becomeTitle}>Become an agent</div>
                          <div className={styles.becomeSubtitle}>Grow your business on our platform</div>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenu.Item>
                )}

                <div className={styles.separator12px} />

                {/* Account Section */}
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/profile">Profile</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/settings">Help centre</Link>
                </DropdownMenu.Item>

                <div className={styles.separator} />
                <DropdownMenu.Item
                  className={`${styles.menuItem} ${styles.logoutItem}`}
                  onSelect={handleSignOut}
                >
                  Log out
                </DropdownMenu.Item>
              </>
            ) : (
              <>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/signup">Sign Up</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/login">Log In</Link>
                </DropdownMenu.Item>
                <div className={styles.separator} />
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/about">About Tutorwise</Link>
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </nav>
  );
};

export default NavMenu;