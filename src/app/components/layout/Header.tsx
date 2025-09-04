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
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import getProfileImageUrl from '@/lib/utils/image';
import NavMenu from './NavMenu';
import styles from './Header.module.css';

const Header = () => {
    const { profile, isLoading } = useUserProfile();

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.logo}>
                    <Link href="/">Vinite</Link>
                </div>
                
                {/* This wrapper correctly groups the navigation and user sections */}
                <div className={styles.rightSection}>
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
                                {/* This form now calls the server-side logout route */}
                                <form action="/api/auth/logout" method="post">
                                    <button type="submit" className={styles.authButton}>
                                        Logout
                                    </button>
                                </form>
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
            </div>
        </header>
    );
};

export default Header;

