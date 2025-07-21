/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the primary, state-aware navigation menu for the application header.
 *
 * Change History:
 * C001 - 2025-07-20 : 17:00 - Initial creation.
 *
 * Last Modified: 2025-07-20 : 17:00
 * Requirement ID (optional): VIN-UI-009
 *
 * Change Summary:
 * Created a new navigation menu component based on the approved "Guan character in a pill" design.
 * It uses Radix UI for an accessible dropdown, manages its own open/close state, and leverages
 * the useAuth hook to display different links for authenticated vs. guest users.
 *
 * Impact Analysis:
 * This component will replace the existing inline navigation in the main Header, centralizing
 * all navigation logic and creating a cleaner, more modern UI.
 *
 * Dependencies: "react", "next/link", "next/image", "@radix-ui/react-dropdown-menu", "@/app/components/auth/AuthProvider", "../ui/nav/GuanMenuIcon".
 * Props (if applicable): None.
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

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button className={styles.menuTrigger} aria-label="Main menu">
          <GuanMenuIcon isOpen={isOpen} />
          {user && (
            <Image
              src={getProfileImageUrl(user)}
              alt="User Avatar"
              width={32}
              height={32}
              className={styles.avatar}
            />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menuContent} sideOffset={10} align="end">
          {isLoading ? (
            <DropdownMenu.Item className={styles.menuItem} disabled>Loading...</DropdownMenu.Item>
          ) : user ? (
            <>
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
              <DropdownMenu.Item onSelect={handleLogout} className={`${styles.menuItem} ${styles.logoutItem}`}>
                Logout
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