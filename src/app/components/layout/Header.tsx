/*
 * Filename: src/app/components/layout/Header.tsx
 * Purpose: Provides the main site navigation header, including context-aware logo link and auth state.
 *
 * Change History:
 * C002 - 2025-07-20 : 14:15 - Implemented toggle logic for the main logo link.
 * C001 - [Date] : [Time] - Refactored to handle auth loading state.
 *
 * Last Modified: 2025-07-20 : 14:15
 * Requirement ID (optional): VIN-UI-005
 *
 * Change Summary:
 * The component now uses the `usePathname` hook to determine the current page. The logo link's `href`
 * is now dynamic: it points to '/refer' when on the homepage ('/') and to '/' on all other pages.
 * This creates the requested toggle effect between the link generator and the marketing page.
 *
 * Impact Analysis:
 * This change enhances the primary navigation flow for new and existing users. It has no negative
 * impact on other components.
 *
 * Dependencies: "react", "next/link", "next/navigation", "@/app/components/auth/AuthProvider".
 */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation'; // --- FIX: Import the usePathname hook
import NavLink from '@/app/components/ui/nav/NavLink'; 
import styles from './Header.module.css';
import { useAuth } from '@/app/components/auth/AuthProvider';

const Header = () => {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  
  // --- FIX: Get the current page's pathname ---
  const pathname = usePathname();

  // --- FIX: Create dynamic link logic ---
  // If we are on the homepage ('/'), the logo links to the marketing page ('/refer').
  // Otherwise (on '/refer' or any other page), it links back to the homepage.
  const logoHref = pathname === '/' ? '/refer' : '/';

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    router.push('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        {/* --- FIX: Use the dynamic href variable --- */}
        <Link href={logoHref}>vinite</Link>
      </div>
      
      <nav className={styles.headerNav}>
        {isLoading ? (
          <div style={{height: '21px'}} />
        ) : user ? (
          <>
            <NavLink href="/dashboard">My Dashboard</NavLink>
            <NavLink href="/settings">Settings</NavLink>
            <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
          </>
        ) : (
          <>
            <NavLink href="/signup?intent=claim">Claim Rewards</NavLink>
            <NavLink href="/login">Login</NavLink>
            <NavLink href="/signup">Sign Up</NavLink>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;