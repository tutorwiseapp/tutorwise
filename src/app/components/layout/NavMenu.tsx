/*
 * Filename: src/app/components/layout/NavMenu.tsx
 * Purpose: Provides the primary, state-aware navigation menu for the application header.
 *
 * Change History:
 * C004 - 2025-07-22 : 14:45 - Refactored handleLogout to use Supabase client, fixing build error.
 * C003 - 2025-07-20 : 19:15 - Re-architected trigger to match the Airbnb two-circle design pattern.
 * C002 - 2025-07-20 : 18:45 - Redesigned logged-in state and reordered menu items.
 * C001 - 2025-07-20 : 17:00 - Initial creation.
 *
 * Last Modified: 2025-07-22 : 14:45
 * Requirement ID (optional): VIN-B-03.1
 *
 * Change Summary:
 * The component no longer attempts to call the mock `logout` function from `useAuth`. Instead, the
 * `handleLogout` function is now an `async` function that calls `supabase.auth.signOut()`. This
 * aligns the component with the new live authentication system and resolves the critical build error.
 *
 * Impact Analysis:
 * This change completes the migration of the header and navigation system to the live backend.
 *
 * Dependencies: "react", "next/link", "@radix-ui/react-dropdown-menu", "@/lib/supabaseClient", "@/app/components/auth/AuthProvider", "../ui/nav/GuanMenuIcon".
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { supabase } from '@/lib/supabaseClient'; // --- FIX: Import the Supabase client
import { useAuth } from '@/app/components/auth/AuthProvider';
import getProfileImageUrl from '@/lib/utils/image';
import GuanMenuIcon from '../ui/nav/GuanMenuIcon';
import styles from './NavMenu.module.css';

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading } = useAuth(); // --- FIX: `logout` is no longer provided by the context
  const router = useRouter();

  // --- FIX: The handler is now an async function that calls Supabase directly ---
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      // Optionally, show an error message to the user
    }
    // The AuthProvider will automatically detect the sign-out and update the user state.
    // We can then redirect the user to the homepage.
    router.push('/');
    router.refresh(); // Recommended to ensure a clean state after logout
  };

  const getRoleDisplayName = () => {
    if (!user?.roles || user.roles.length === 0) return 'Member';
    const role = user.roles[0];
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
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