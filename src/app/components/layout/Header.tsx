// src/app/components/layout/Header.tsx - REFACTORED

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavLink from '@/app/components/ui/nav/NavLink'; 
import styles from './Header.module.css';
import { useAuth } from '@/app/components/auth/AuthProvider';

const Header = () => {
  const router = useRouter();
  // Destructure isLoading from the hook
  const { user, logout, isLoading } = useAuth();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
    router.push('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <Link href="/">vinite</Link>
      </div>
      
      <nav className={styles.headerNav}>
        {/*
          This is the critical change.
          If we are still loading, render nothing or a placeholder.
          This ensures the server render and the first client render match.
        */}
        {isLoading ? (
          <div style={{height: '21px'}} /> // Or a skeleton loader
        ) : user ? (
          // --- Logged-In User View ---
          <>
            <NavLink href="/dashboard">My Dashboard</NavLink>
            <NavLink href="/settings">Settings</NavLink>
            <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
          </>
        ) : (
          // --- Guest User View ---
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