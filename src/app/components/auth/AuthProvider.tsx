'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import type { User } from '@/types';
import { usePathname } from 'next/navigation';

// Create a context to hold the user data and a function to update it
interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to easily access the user context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  // On initial mount, check localStorage for a logged-in user
  useEffect(() => {
    setIsMounted(true);
    const loggedInUserString = localStorage.getItem('vinite_loggedin_user');
    if (loggedInUserString) {
      setUser(JSON.parse(loggedInUserString));
    }
  }, []);

  // This effect listens for route changes to re-check login status,
  // which fixes the "stuck" header issue after login.
  useEffect(() => {
    const loggedInUserString = localStorage.getItem('vinite_loggedin_user');
    if (loggedInUserString) {
      setUser(JSON.parse(loggedInUserString));
    } else {
      setUser(null);
    }
  }, [pathname]);


  const login = (userData: User) => {
    localStorage.setItem('vinite_loggedin_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('vinite_loggedin_user');
    setUser(null);
  };

  if (!isMounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header user={user} onLogout={logout} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
}