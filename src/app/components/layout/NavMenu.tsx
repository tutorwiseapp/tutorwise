/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the primary, state-aware navigation menu for the application header.
 *
 * Change History:
 * C006 - 2025-07-23 : 01:30 - Restored Log In and Sign Up links to the logged-out menu.
 * C005 - 2025-07-22 : 23:55 - Finalized trigger design and removed focus outline.
 * ... (previous history)
 *
 * Last Modified: 2025-07-23 : 01:30
 * Requirement ID (optional): VIN-M-01.7
 *
 * Change Summary:
 * The dropdown menu for logged-out users has been corrected. It now includes distinct links for
 * "Log In" (`/login`) and "Sign Up" (`/signup`), restoring the email/password authentication
 * flow that was previously inaccessible. The options are now logically grouped and separated.
 *
 * Impact Analysis:
 * This change fixes a critical regression and makes all authentication methods available to the user.
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSession, signIn, signOut } from 'next-auth/react';
import GuanMenuIcon from '../ui/nav/GuanMenuIcon';
import styles from './NavMenu.module.css';

// This helper is no longer needed with the NextAuth session object
// import getProfileImageUrl from '@/lib/utils/image';

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        {user ? (
          <button className={styles.loggedInTrigger} aria-label="Open user menu">
            <Image
              src={user.image || '/default-avatar.png'}
              alt="User Avatar"
              width={40}
              height={40}
              className={styles.avatar}
            />
            <GuanMenuIcon isOpen={isOpen} />
          </button>
        ) : (
          <button className={styles.loggedOutTrigger} aria-label="Open main menu">
            <GuanMenuIcon isOpen={isOpen} />
          </button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menuContent} sideOffset={10} align="end">
          {isLoading ? (
            <DropdownMenu.Item className={styles.menuItem} disabled>Loading...</DropdownMenu.Item>
          ) : user ? (
            <>
              <DropdownMenu.Label className={styles.roleLabel}>{user.name}</DropdownMenu.Label>
              <DropdownMenu.Separator className={styles.separator} />
              <DropdownMenu.Item asChild className={styles.menuItem}><Link href="/dashboard">My Dashboard</Link></DropdownMenu.Item>
              <DropdownMenu.Item asChild className={styles.menuItem}><Link href="/settings">Settings</Link></DropdownMenu.Item>
              <DropdownMenu.Item asChild className={styles.menuItem}><Link href="/profile">My Profile</Link></DropdownMenu.Item>
              <DropdownMenu.Separator className={styles.separator} />
              <DropdownMenu.Item onSelect={() => signOut()} className={`${styles.menuItem} ${styles.logoutItem}`}>
                Logout
              </DropdownMenu.Item>
            </>
          ) : (
            <>
              {/* --- THIS IS THE FIX --- */}
              <DropdownMenu.Item asChild className={styles.menuItem}>
                <Link href="/signup">Sign Up</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild className={styles.menuItem}>
                <Link href="/login">Log In</Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={styles.separator} />
              <DropdownMenu.Item onSelect={() => signIn('google')} className={styles.menuItem}>
                Sign In with Google
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