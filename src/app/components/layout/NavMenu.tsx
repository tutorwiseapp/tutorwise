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
import Link from 'next/link';
import Image from 'next/image';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { useUserProfile } from '@/app/contexts/UserProfileContext';
import GuanMenuIcon from '../ui/nav/GuanMenuIcon';
import styles from './NavMenu.module.css';
import getProfileImageUrl from '@/lib/utils/image';

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, isLoading } = useUserProfile();

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
                <DropdownMenu.Label className={styles.roleLabel}>
                  {profile.display_name || 'Member'}
                </DropdownMenu.Label>
                <DropdownMenu.Separator className={styles.separator} />
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/dashboard">My Dashboard</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/profile">My Profile</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/settings">Settings</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={styles.separator} />
                {/* --- THIS IS THE FIX --- */}
                <form action="/api/auth/logout" method="post" style={{ display: 'contents' }}>
                  <DropdownMenu.Item asChild className={`${styles.menuItem} ${styles.logoutItem}`}>
                    <button type="submit" style={{ all: 'unset', width: '100%', cursor: 'pointer' }}>
                      Sign Out
                    </button>
                  </DropdownMenu.Item>
                </form>
              </>
            ) : (
              <>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/signup">Sign Up</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/login">Log In</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={styles.separator} />
                 <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/refer">What is Vinite?</Link>
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