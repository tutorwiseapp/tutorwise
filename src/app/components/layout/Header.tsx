'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NavLink from '@/app/components/ui/nav/NavLink'; 
import styles from './Header.module.css';

// --- THIS IS THE KEY ---
// Import the useAuth hook to get the shared user state
import { useAuth } from '@/app/components/auth/AuthProvider';

const Header = () => {
  const router = useRouter();
  
  // Get the user and logout function directly from our central provider
  const { user, logout } = useAuth();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout(); // Use the central logout function
    router.push('/');
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <Link href="/">vinite</Link>
      </div>
      
      <nav className={styles.headerNav}>
        {/* The logic is now much simpler. It just checks the 'user' from the context. */}
        {user ? (
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