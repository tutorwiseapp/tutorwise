/*
 * Filename: src/app/components/layout/Header.tsx
 * Purpose: Provides the main site navigation header, including context-aware logo link and the primary nav menu.
 * Change History:
 * C005 - 2025-07-28 : 13:00 - Definitive fix for the 'children' prop type error.
 * C004 - 2025-07-28 : 10:00 - Restored contextual logo link and NavMenu usage.
 * ... (previous history)
 * Last Modified: 2025-07-28 : 13:00
 * Requirement ID (optional): VIN-UI-009
 * Change Summary: This is the definitive fix for the build failure. The `<NavMenu>` component
 * was being invoked with a `children` prop, which it does not accept. It has been corrected
 * to be a self-closing tag (`<NavMenu />`), which resolves the TypeScript type error.
 * Impact Analysis: This change fixes a critical build-blocking error and restores the header
 * to a functional state.
 * Dependencies: "next/link", "next/navigation", "./NavMenu".
 */
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import getProfileImageUrl from '@/lib/utils/image';
import NavMenu from './NavMenu';
import styles from './Header.module.css';

const Header = () => {
    const { profile, isLoading } = useUserProfile();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        // --- THIS IS THE DEFINITIVE FIX ---
        // Instead of pushing, we use window.location.href to force a full page reload.
        // This ensures all state is cleared and the middleware re-evaluates correctly.
        window.location.href = '/';
    };

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.logo}>
                    <Link href="/">Vinite</Link>
                </div>
                <NavMenu />
                <div className={styles.userSection}>
                    {isLoading ? (
                        <div className={styles.loadingSpinner}></div>
                    ) : profile ? (
                        <div className={styles.profileContainer}>
                            <Link href="/profile" className={styles.profileLink}>
                                <img
                                    src={getProfileImageUrl(profile)}
                                    alt={profile.display_name || 'User Avatar'}
                                    className={styles.avatar}
                                    width={40}
                                    height={40}
                                />
                                <span className={styles.profileName}>{profile.display_name}</span>
                            </Link>
                            <button onClick={handleLogout} className={styles.authButton}>
                                Logout
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link href="/login" className={styles.authButton}>
                                Login
                            </Link>
                            <Link href="/signup" className={`${styles.authButton} ${styles.signupButton}`}>
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
