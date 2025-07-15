'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// CORRECTED: The import path now uses the robust '@/' alias.
import NavLink from '@/app/components/ui/nav/NavLink'; 
import styles from './Header.module.css';
import type { User } from '@/types';

const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true); 
    
    const loggedInUserString = localStorage.getItem('vinite_loggedin_user');
    if (loggedInUserString) {
      setUser(JSON.parse(loggedInUserString));
    }
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('vinite_loggedin_user');
    setUser(null);
    router.push('/');
    router.refresh(); 
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <Link href="/">vinite</Link>
      </div>
      
      <nav className={styles.headerNav}>
        {!isMounted ? (
          <div style={{ height: '21px' }} /> 
        ) : user ? (
          <>
            <NavLink href="/dashboard">My Dashboard</NavLink>
            <NavLink href="/settings">Settings</NavLink>
            <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
          </>
        ) : (
          <>
            <NavLink href="/login">Login</NavLink>
            <NavLink href="/signup">Sign Up</NavLink>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;