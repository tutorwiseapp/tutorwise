/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the main site navigation header, migrated to use the Kinde authentication client.
 * Change History:
 * C002 - 2025-08-26 : 10:00 - Replaced all Clerk components and hooks with the Kinde Next.js SDK.
 * C001 - [Date] : [Time] - Initial creation with Clerk.
 * Last Modified: 2025-08-26 : 10:00
 * Requirement ID: VIN-AUTH-MIG-02
 * Change Summary: This component has been fully migrated from Clerk to Kinde. It now uses the `useKindeBrowserClient` hook to get the user's session state and conditionally renders UI elements based on the `isAuthenticated` status. The previous `<SignedIn>` and `<SignedOut>` components have been replaced with this hook. All authentication actions (Login, Logout, Sign Up) now use the official Kinde components (`<LoginLink>`, `<LogoutLink>`, `<RegisterLink>`), which handle the redirection to Kinde's hosted pages.
 * Impact Analysis: This is a critical step in the authentication migration. It makes the primary user navigation functional with the new Kinde system.
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// --- THIS IS THE FIX: Import Kinde components and hooks ---
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { LoginLink, LogoutLink, RegisterLink } from '@kinde-oss/kinde-auth-nextjs/components';

// --- Local component imports are preserved ---
import GuanMenuIcon from '../ui/nav/GuanMenuIcon';
import styles from './NavMenu.module.css';

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // --- THIS IS THE FIX: Replace Clerk's useUser with Kinde's hook ---
  const { user, isAuthenticated, isLoading } = useKindeBrowserClient();

  // While Kinde is checking the session, render nothing to avoid a layout flash
  if (isLoading) {
    return null;
  }

  return (
    <nav>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            className={isAuthenticated ? styles.loggedInTrigger : styles.loggedOutTrigger}
            aria-label="Open user menu"
          >
            {/* --- THIS IS THE FIX: Conditional rendering based on Kinde's state --- */}
            {isAuthenticated ? (
              <>
                <Image
                  src={user?.picture || '/default-avatar.png'}
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
            {/* --- THIS IS THE FIX: Use isAuthenticated for conditional rendering --- */}
            {isAuthenticated ? (
              <>
                <DropdownMenu.Label className={styles.roleLabel}>
                  {user?.given_name || 'Member'}
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
                  asChild
                  className={`${styles.menuItem} ${styles.logoutItem}`}
                >
                  {/* --- THIS IS THE FIX: Use Kinde's LogoutLink component --- */}
                  <LogoutLink>Sign Out</LogoutLink>
                </DropdownMenu.Item>
              </>
            ) : (
              <>
                {/* --- THIS IS THE FIX: Use Kinde's RegisterLink and LoginLink --- */}
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <RegisterLink>Sign Up</RegisterLink>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={styles.menuItem}>
                  <LoginLink>Log In</LoginLink>
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