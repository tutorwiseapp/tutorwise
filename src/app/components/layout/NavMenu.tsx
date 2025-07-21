/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the primary, state-aware navigation menu for the application header.
 *
 * Change History:
 * C003 - 2025-07-20 : 19:15 - Re-architected trigger to match the Airbnb two-circle design pattern.
 * C002 - 2025-07-20 : 18:45 - Redesigned logged-in state and reordered menu items.
 * C001 - 2025-07-20 : 17:00 - Initial creation.
 *
 * Last Modified: 2025-07-20 : 19:15
 * Requirement ID (optional): VIN-UI-011
 *
 * Change Summary:
 * The menu trigger has been re-architected to align with the Airbnb UX pattern. For logged-in users,
 * the trigger is a single button containing two visual elements: the user's avatar on the left and
 * the Vinite Sphere icon on the right. For guests, it's just the sphere. This creates a more
 * consistent and intuitive user experience.
 *
 * Impact Analysis:
 * This is the final, polished version of the navigation menu, offering a best-in-class UX.
 *
 * Dependencies: "react", "next/link", "next/image", "@radix-ui/react-dropdown-menu", "@/app/components/auth/AuthProvider", "../ui/nav/GuanMenuIcon".
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAuth } from '@/app/components/auth/AuthProvider';
import getProfileImageUrl from '@/lib/utils/image';
import GuanMenuIcon from '../ui/nav/GuanMenuIcon';
import styles from './NavMenu.module.css';

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getRoleDisplayName = () => {
    if (!user?.roles || user.roles.length === 0) return 'Member';
    const role = user.roles[0];
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        {/* --- THIS IS THE FIX: A single button whose *contents* are conditional --- */}
        <button
          className={user ? styles.loggedInTrigger : styles.loggedOutTrigger}
          aria-label="Open user menu"
        >
          {user && (
            <Image
              src={getProfileImageUrl(user)}
              alt="User Avatar"
              width={36}
              height={36}
              className={styles.avatar}
            />
          )}
          <GuanMenuIcon isOpen={isOpen} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menuContent} sideOffset={10} align="end">
          {isLoading ? (
            <DropdownMenu.Item className={styles.menuItem} disabled>Loading...</DropdownMenu.Item>
          ) : user ? (
            // Logged-in menu order is correct
            <>
              <DropdownMenu.Label className={styles.roleLabel}>
                {getRoleDisplayName()}
              </DropdownMenu.Label>
              <DropdownMenu.Separator className={styles.separator} />
              <DropdownMenu.Item asChild className={styles.menuItem}>
                <Link href="/dashboard">My Dashboard</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild className={styles.menuItem}>
                <Link href="/settings">Settings</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild className={styles.menuItem}>
                <Link href="/profile">My Profile</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={styles.separator} />
              <DropdownMenu.Item onSelect={handleLogout} className={`${styles.menuItem} ${styles.logoutItem}`}>
                Logout
              </DropdownMenu.Item>
            </>
          ) : (
            // Guest menu remains the same
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
  );
};

export default NavMenu;