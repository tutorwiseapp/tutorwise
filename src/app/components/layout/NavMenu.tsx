/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the primary, state-aware navigation menu for the application header.
 * Change History:
 * C006 - 2025-07-28 : 09:00 - Definitive fix to resolve merge conflicts and finalize Clerk migration.
 * C005 - 2025-07-28 : 10:00 - Restored the custom "pill menu" UI.
 * C004 - 2025-07-26 : 18:30 - Restored the pill menu trigger for the logged-out state.
 * ... (previous history)
 * Last Modified: 2025-07-28 : 09:00
 * Requirement ID: VIN-UI-009
 * Change Summary: This is the definitive fix for the merge conflict that was causing the build
 * to fail. The file has been manually repaired to remove all conflict markers and remnants of
 * the old NextAuth.js system. It now correctly and exclusively uses Clerk's hooks and components.
 * Impact Analysis: This change resolves a critical build-blocking error and restores all
 * header navigation functionality, making the `main` branch stable and deployable.
 * Dependencies: "@clerk/nextjs", "@radix-ui/react-dropdown-menu", "next/link", "next/image".
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useUser, useClerk, SignedIn, SignedOut } from '@clerk/nextjs';
import GuanMenuIcon from '../ui/nav/GuanMenuIcon';
import styles from './NavMenu.module.css';

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const getRoleDisplayName = () => {
    if (!user) return 'Member';
    const role = (user.publicMetadata?.role as string) || 'agent';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <nav>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            className={user ? styles.loggedInTrigger : styles.loggedOutTrigger}
            aria-label="Open user menu"
          >
            <SignedIn>
              <Image
                src={user?.imageUrl || '/default-avatar.png'}
                alt="User Avatar"
                width={40}
                height={40}
                className={styles.avatar}
              />
              <GuanMenuIcon isOpen={isOpen} />
            </SignedIn>
            <SignedOut>
              <GuanMenuIcon isOpen={isOpen} />
            </SignedOut>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content className={styles.menuContent} sideOffset={10} align="end">
            <SignedIn>
              <>
                <DropdownMenu.Label className={styles.roleLabel}>
                  {getRoleDisplayName()}
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
                <DropdownMenu.Item
                  className={`${styles.menuItem} ${styles.logoutItem}`}
                  onSelect={() => signOut(() => router.push('/'))}
                >
                  Sign Out
                </DropdownMenu.Item>
              </>
            </SignedIn>
            <SignedOut>
              <>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/sign-up">Sign Up</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/sign-in">Log In</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={styles.separator} />
                 <DropdownMenu.Item asChild className={styles.menuItem}>
                  <Link href="/refer">What is Vinite?</Link>
                </DropdownMenu.Item>
              </>
            </SignedOut>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </nav>
  );
};

export default NavMenu;