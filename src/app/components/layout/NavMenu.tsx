/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the primary, state-aware navigation menu for the application header.
 * Change History:
 * C004 - 2025-07-26 : 18:30 - Restored the pill menu trigger for the logged-out state.
 * C003 - 2025-07-26 : 14:15 - Replaced Clerk's UserButton with a custom Radix UI dropdown.
 * C002 - 2025-07-26 : 11:30 - Restored original pill menu design and updated auth links.
 * C001 - 2025-07-26 : 10:30 - Initial Clerk conversion.
 * Last Modified: 2025-07-26 : 18:30
 * Requirement ID: VIN-UI-009
 * Change Summary: The component has been corrected to use the custom Radix UI dropdown and
 * the GuanMenuIcon trigger for BOTH the signed-in and signed-out states. This restores the
 * intended visual design of the header for all users and fixes the UI inconsistency.
 * Impact Analysis: This change perfects the header's UI/UX, ensuring a consistent
 * navigation experience whether a user is authenticated or not.
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
              {/* This is your preserved pill menu design for logged-in users */}
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
              {/* This is the restored pill menu icon for logged-out users */}
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