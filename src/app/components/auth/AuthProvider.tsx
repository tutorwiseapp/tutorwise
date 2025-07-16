'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import type { User } from '@/types';
import { usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    setIsMounted(true);
    const loggedInUserString = localStorage.getItem('vinite_loggedin_user');
    if (loggedInUserString) {
      setUser(JSON.parse(loggedInUserString));
    }
  }, []);

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
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        {/* --- THIS IS THE FIX --- */}
        {/* The Header component no longer needs props passed to it. */}
        <Header />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
}